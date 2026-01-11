'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Report, ReportWithDetails, ReportFormData, User, ServiceResponse } from '@/lib/types';
import { logReportApproval, createAuditLog } from './auditLogService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { deleteFile, extractFilePath } from './storageService';
import notificationService from './notificationService';
import { ROLES } from '@/lib/constants';
import { checkPeriod } from './accountingService';
import { checkBudgetIntegrity } from './budgetService';
import { batchSignAvatars } from './enrichmentService';
import { notifyBudgetOverrun } from './notificationService';

// ... existing code ...

// Helper to normalize images from JSON
const normalizeImages = (images: any): Array<{ name: string; url: string }> | undefined => {
  if (!images) return undefined;
  if (!Array.isArray(images)) return undefined;

  // Security LIMIT: Max 10 images to prevent unbounded JSON growth
  const SAFE_LIMIT = 10;
  const slicedImages = images.slice(0, SAFE_LIMIT);

  return slicedImages
    .map((it: any) => {
      if (typeof it?.name === 'string' && typeof it?.url === 'string' && (it.url.startsWith('http://') || it.url.startsWith('https://'))) {
        return { name: it.name, url: it.url };
      }
      return undefined;
    })
    .filter(Boolean) as Array<{ name: string; url: string }>;
};

const normalizeAttachments = (attachments: any): string[] | undefined => {
  if (!attachments) return undefined;
  if (!Array.isArray(attachments)) return undefined;
  return attachments.filter((x: any) => typeof x === 'string');
};

// Server-safe date filter
type ServerDateFilter = {
  rangeKey?: string;
  from?: Date;
  to?: Date;
};

const computeDateRange = (dateFilter?: ServerDateFilter): { startDate?: Date; endDate?: Date } => {
  if (!dateFilter || (!dateFilter.from && !dateFilter.to && !dateFilter.rangeKey) || dateFilter.rangeKey === 'all_time') return {};
  if (dateFilter.from || dateFilter.to) return { startDate: dateFilter.from, endDate: dateFilter.to };

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const s = startOfDay(now);

  const rangeMap: Record<string, () => { startDate: Date; endDate: Date }> = {
    today: () => {
      const e = new Date(s);
      e.setDate(e.getDate() + 1);
      return { startDate: s, endDate: e };
    },
    this_week: () => {
      const diff = (s.getDay() + 6) % 7;
      s.setDate(s.getDate() - diff);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      return { startDate: s, endDate: e };
    },
    this_month: () => {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { startDate: start, endDate: end };
    },
    last_30_days: () => {
      const start = new Date(s);
      start.setDate(start.getDate() - 30);
      return { startDate: start, endDate: s };
    },
    last_90_days: () => {
      const start = new Date(s);
      start.setDate(start.getDate() - 90);
      return { startDate: start, endDate: s };
    },
    this_year: () => {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { startDate: start, endDate: end };
    }
  };

  return rangeMap[dateFilter.rangeKey ?? 'all_time']?.() ?? {};
};

export interface ReportFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: ServerDateFilter;
  statusFilter?: Record<Report['status'], boolean>;
}

// Helper to map Prisma result to Report type
const mapPrismaReportToModel = (report: any): ReportWithDetails => {
  return {
    id: report.id,
    title: report.title,
    activityDate: report.activityDate?.toISOString() ?? '',
    submissionDate: report.submissionDate?.toISOString() ?? '',
    level: report.level,
    status: report.status,
    content: report.content,
    thematic: report.thematic,
    speaker: report.speaker ?? undefined,
    moderator: report.moderator ?? undefined,
    girlsCount: report.girlsCount ?? undefined,
    boysCount: report.boysCount ?? undefined,
    participantsCountReported: report.participantsCountReported ?? undefined,
    totalExpenses: report.totalExpenses ?? undefined,
    currency: report.currency ?? undefined,
    financialSummary: report.financialSummary ?? undefined,
    reviewNotes: report.reviewNotes ?? undefined,
    images: normalizeImages(report.images),
    attachments: normalizeAttachments(report.attachments),
    submittedBy: report.submittedById,
    siteId: report.siteId ?? undefined,
    smallGroupId: report.smallGroupId ?? undefined,
    activityTypeId: report.activityTypeId,

    // Enriched fields
    submittedByName: report.submittedBy?.name,
    submittedByAvatarUrl: report.submittedBy?.avatarUrl,
    siteName: report.site?.name,
    smallGroupName: report.smallGroup?.name,
  };
};

/**
 * Batch sign avatars for a list of reports
 */
// signReportAvatars is now centralized in enrichmentService.ts

export async function getReportById(id: string): Promise<Report> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const userId = user?.id || 'anonymous';

  return await withRLS(userId, async () => {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        submittedBy: true,
        site: true,
        smallGroup: true,
        activityType: true,
      }
    });

    if (!report) {
      throw new Error('Report not found.');
    }

    const model = mapPrismaReportToModel(report);
    const signed = await batchSignAvatars([model], ['submittedByAvatarUrl']);
    return signed[0];
  });
}

export async function createReport(reportData: ReportFormData, overrideUser?: any): Promise<ServiceResponse<ReportWithDetails>> {
  const { getUser } = getKindeServerSession();
  const user = overrideUser || await getUser();

  if (!user?.id) {
    throw new Error('Unauthorized');
  }

  // 1. Idempotency Check (Pre-Transaction)
  if (reportData.idempotencyKey) {
    const existing = await basePrisma.idempotencyKey.findUnique({
      where: { key: reportData.idempotencyKey }
    });
    if (existing) {
      return existing.response as any;
    }
  }

  return await withRLS(user.id, async () => {
    // 2. Mutual Exclusivity & Level Validation
    if (reportData.level === 'national') {
      reportData.siteId = undefined;
      reportData.smallGroupId = undefined;
    } else if (reportData.level === 'site') {
      if (!reportData.siteId) throw new Error('Site ID is required for site-level reports.');
      reportData.smallGroupId = undefined;
    } else if (reportData.level === 'small_group' && !reportData.smallGroupId) {
      throw new Error('Small Group ID is required for small-group-level reports.');
    }

    try {
      const result = await basePrisma.$transaction(async (tx: any) => {
        // A. Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

        // B. CRITICAL: Prevent multiple reports per activity
        if (reportData.activityId) {
          const existingReport = await tx.report.findFirst({
            where: { activityId: reportData.activityId },
            select: { id: true, title: true, status: true }
          });

          if (existingReport) {
            throw new Error(
              `ACTIVITY_ALREADY_REPORTED: Un rapport existe déjà pour cette activité. ` +
              `Rapport existant: "${existingReport.title}" (statut: ${existingReport.status}).`
            );
          }
        }

        // C. Create Report
        const report = await tx.report.create({
          data: {
            title: reportData.title,
            activityDate: reportData.activityDate,
            level: reportData.level,
            status: reportData.status,
            content: reportData.content,
            thematic: reportData.thematic,
            speaker: reportData.speaker,
            moderator: reportData.moderator,
            girlsCount: reportData.girlsCount,
            boysCount: reportData.boysCount,
            participantsCountReported: reportData.participantsCountReported,
            totalExpenses: reportData.totalExpenses,
            currency: reportData.currency,
            financialSummary: reportData.financialSummary,
            images: reportData.images as any,
            attachments: reportData.attachments as any,
            submittedById: user.id,
            siteId: reportData.siteId,
            smallGroupId: reportData.smallGroupId,
            activityTypeId: reportData.activityTypeId,
            activityId: reportData.activityId,
          },
          include: {
            submittedBy: true,
            site: true,
            smallGroup: true,
            activityType: true,
          }
        });

        const model = mapPrismaReportToModel(report);

        // D. Update/Create Idempotency Key
        if (reportData.idempotencyKey) {
          await tx.idempotencyKey.upsert({
            where: { key: reportData.idempotencyKey },
            create: {
              key: reportData.idempotencyKey,
              response: model as any
            },
            update: {
              response: model as any
            }
          });
        }

        // E. Notify Reviewers (Best Effort within transaction but safe)
        const nationalCoordinators = await tx.profile.findMany({
          where: { role: ROLES.NATIONAL_COORDINATOR }
        });

        for (const nc of nationalCoordinators) {
          await notificationService.notifyNewReport(
            nc.id,
            report.title,
            report.id,
            report.submittedBy.name,
            tx
          ).catch(err => console.error(`Failed to notify NC ${nc.id}:`, err));
        }

        return model;
      }, { timeout: 20000 });

      return { success: true, data: result };

    } catch (dbError: any) {
      if (dbError.message?.includes('ACTIVITY_ALREADY_REPORTED')) {
        return { success: false, error: { message: 'ACTIVITY_ALREADY_REPORTED' } };
      }

      // ATOMIC ROLLBACK STRATEGY for Assets
      console.error('[CreateReport] Database failure, initiating rollback for uploaded assets...', dbError);
      const rollbackQueue = [];
      if (Array.isArray(reportData.images)) {
        for (const img of reportData.images) if (img.url) rollbackQueue.push(img.url);
      }
      if (Array.isArray(reportData.attachments)) {
        for (const url of reportData.attachments) if (typeof url === 'string') rollbackQueue.push(url);
      }

      await Promise.allSettled(
        rollbackQueue.map(url => deleteFile(extractFilePath(url, 'report-images'), { isRollback: true }))
      ).catch(err => console.error('[CreateReport] Critical: Multi-asset rollback failed:', err));

      return { success: false, error: { message: dbError.message || 'Failed to create report' } };
    }
  });
}

export async function updateReport(reportId: string, updatedData: Partial<ReportFormData>): Promise<ServiceResponse<ReportWithDetails>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user?.id) return { success: false, error: { message: 'Unauthorized' } };

    const result = await withRLS(user.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

        // Fetch existing for period check
        const existing = await tx.report.findUnique({ where: { id: reportId } });
        if (!existing) throw new Error('Report not found');

        await checkPeriod(existing.activityDate, 'Modification de rapport (existant)');
        if (updatedData.activityDate) {
          await checkPeriod(new Date(updatedData.activityDate), 'Modification de rapport (nouvelle date)');
        }

        // If level is changing, enforce exclusivity
        if (updatedData.level === 'national') {
          updatedData.siteId = undefined;
          updatedData.smallGroupId = undefined;
        } else if (updatedData.level === 'site') {
          updatedData.smallGroupId = undefined;
        }

        const updateData = mapUpdateDataFields(updatedData);

        const report = await tx.report.update({
          where: { id: reportId },
          data: updateData,
          include: {
            submittedBy: true,
            site: true,
            smallGroup: true,
            activityType: true,
          }
        });

        return mapPrismaReportToModel(report);
      });
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[ReportService] Update Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

function mapUpdateDataFields(updatedData: Partial<ReportFormData>) {
  const updateData: Record<string, any> = {};
  const fields = [
    'title', 'activityDate', 'level', 'status', 'content', 'thematic',
    'speaker', 'moderator', 'girlsCount', 'boysCount',
    'participantsCountReported', 'totalExpenses', 'currency',
    'financialSummary', 'images', 'attachments', 'siteId',
    'smallGroupId', 'activityTypeId', 'activityId'
  ];

  for (const field of fields) {
    if ((updatedData as any)[field] !== undefined) {
      updateData[field] = (updatedData as any)[field];
    }
  }
  return updateData;
}

export async function deleteReport(id: string): Promise<ServiceResponse<void>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user?.id) return { success: false, error: { message: 'Unauthorized' } };

    await withRLS(user.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

        const existing = await tx.report.findUnique({ where: { id } });
        if (!existing) throw new Error('Report not found');

        await checkPeriod(existing.activityDate, 'Suppression de rapport');

        await tx.report.delete({
          where: { id },
        });
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[ReportService] Delete Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

export async function getFilteredReports(filters: ReportFilters): Promise<ReportWithDetails[]> {
  const { user, entity } = filters;
  const { getUser } = getKindeServerSession();
  const sessionUser = user || await getUser();

  if (!sessionUser && !entity) {
    throw new Error('User or entity is required to fetch reports.');
  }

  const userId = sessionUser?.id || 'anonymous';

  return await withRLS(userId, async () => {
    const where = buildReportWhereClause(filters);

    const reports = await prisma.report.findMany({
      where,
      include: {
        submittedBy: true,
        site: true,
        smallGroup: true,
        activityType: true,
      },
      orderBy: { submissionDate: 'desc' }
    });

    const models = reports.map(mapPrismaReportToModel);
    return batchSignAvatars(models, ['submittedByAvatarUrl']);
  });
}

function buildReportWhereClause(filters: ReportFilters) {
  const { user, entity, searchTerm, dateFilter, statusFilter } = filters;
  const where: any = {};

  // 1. Entity Filter
  if (entity) {
    return applyEntityFilter({}, entity);
  }

  // 2. User Role Filter (if no entity)
  if (user) {
    const userFilter = applyUserRoleFilter({}, user);
    if (!userFilter) return { id: 'nothing' }; // invalid state
    Object.assign(where, userFilter);
  }

  // 3. Date Filter
  if (dateFilter) {
    applyDateFilter(where, dateFilter);
  }

  // 4. Search
  if (searchTerm) {
    where.title = { contains: searchTerm, mode: 'insensitive' };
  }

  // 5. Status
  if (statusFilter) {
    applyStatusFilter(where, statusFilter);
  }

  return where;
}

function applyDateFilter(where: any, dateFilter: ServerDateFilter) {
  const { startDate, endDate } = computeDateRange(dateFilter);
  if (startDate || endDate) {
    where.activityDate = {};
    if (startDate) where.activityDate.gte = startDate;
    if (endDate) where.activityDate.lte = endDate;
  }
}

function applyStatusFilter(where: any, statusFilter: Record<Report['status'], boolean>) {
  const activeStatuses = Object.entries(statusFilter)
    .filter(([, isActive]) => isActive)
    .map(([status]) => status);

  if (activeStatuses.length > 0) {
    where.status = { in: activeStatuses };
  }
}

function applyEntityFilter(where: any, entity: { type: 'site' | 'smallGroup'; id: string }) {
  if (entity.type === 'site') where.siteId = entity.id;
  else where.smallGroupId = entity.id;
  return where;
}

function applyUserRoleFilter(where: any, user: User) {
  switch (user.role) {
    case 'SITE_COORDINATOR':
      if (user.siteId) {
        where.siteId = user.siteId;
        return where;
      }
      return null;
    case 'SMALL_GROUP_LEADER':
      if (user.smallGroupId) {
        where.smallGroupId = user.smallGroupId;
        return where;
      }
      return null;
    default:
      // National Coordinator or others see everything (subject to other filters)
      return where;
  }
}

/**
 * Approve a report (National Coordinator only)
 * Automatically generates FinancialTransactions based on report expenses
 */
export async function approveReport(
  reportId: string,
  approvedById: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<ReportWithDetails>> {
  try {
    return await basePrisma.$transaction(async (tx: any) => {
      // 1. Manually set RLS context
      await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${approvedById.replace(/'/g, "''")}'`);

      // 2. Fetch targets inside transaction for strict isolation
      const before = await tx.report.findUnique({
        where: { id: reportId },
        include: { activity: true, site: true, smallGroup: true }
      });

      if (!before) throw new Error('Report not found');
      if (before.status === 'approved') throw new Error('Report already approved');

      // ✅ Accounting Period Guard
      await checkPeriod(before.activityDate, 'Approbation de rapport');

      const generatedTransactionIds: string[] = [];

      // 3. Mark report as approved
      const approvedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedById: approvedById,
        },
        include: {
          activity: true,
          smallGroup: true,
          site: true,
          submittedBy: true,
          reviewedBy: true,
          activityType: true,
        },
      });

      // 4. Mark related activity as executed
      if (approvedReport.activityId) {
        await tx.activity.update({
          where: { id: approvedReport.activityId },
          data: { status: 'executed' },
        });
      }

      // 5. Generate FinancialTransaction if expenses exist
      if (approvedReport.totalExpenses && Number(approvedReport.totalExpenses) > 0) {
        const transaction = await tx.financialTransaction.create({
          data: {
            type: 'expense',
            category: 'Activity Expense',
            amount: approvedReport.totalExpenses,
            date: approvedReport.activityDate,
            description: `Dépenses pour: ${approvedReport.title}`,
            siteId: approvedReport.siteId,
            smallGroupId: approvedReport.smallGroupId,
            recordedById: approvedById,
            status: 'approved',
            approvedById: approvedById,
            approvedAt: new Date(),
            relatedReportId: reportId,
            relatedActivityId: approvedReport.activityId,
            isSystemGenerated: true
          },
        });
        generatedTransactionIds.push(transaction.id);
      }

      // 6. Integrated Audit Log (inside tx)
      await logReportApproval(
        approvedById,
        reportId,
        before,
        approvedReport,
        generatedTransactionIds,
        ipAddress,
        userAgent,
        tx
      );

      // 7. Notify Submitter (safe within tx)
      await notificationService.notifyReportApproved(
        approvedReport.submittedById,
        approvedReport.title,
        approvedReport.id,
        tx
      );

      // 8. Budget Overrun Detection
      try {
        const integrity = await checkBudgetIntegrity({
          siteId: approvedReport.siteId || undefined,
          smallGroupId: approvedReport.smallGroupId || undefined
        }, tx);

        if (integrity.isOverrun) {
          const entityName = approvedReport.smallGroup?.name || approvedReport.site?.name || 'Inconnu';
          await notifyBudgetOverrun({
            siteId: approvedReport.siteId || undefined,
            smallGroupId: approvedReport.smallGroupId || undefined,
            entityName,
            balance: integrity.balance,
            tx
          });
        }
      } catch (e) {
        console.error('[BudgetAlert] Failed to check budget integrity during approval:', e);
      }

      const finalModel = mapPrismaReportToModel(approvedReport);
      return { success: true, data: finalModel };
    });
  } catch (error: any) {
    console.error(`[ReportService] Approval Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

/**
 * Reject a report
 */
export async function rejectReport(
  reportId: string,
  rejectedById: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<ReportWithDetails>> {
  try {
    const result = await withRLS(rejectedById, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // 1. Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${rejectedById.replace(/'/g, "''")}'`);

        const before = await tx.report.findUnique({ where: { id: reportId } });
        if (!before) throw new Error('Report not found');

        const rejectedReport = await tx.report.update({
          where: { id: reportId },
          data: {
            status: 'rejected',
            reviewedAt: new Date(),
            reviewedById: rejectedById,
            reviewNotes: reason,
            rejectionReason: reason,
          },
          include: {
            activity: true,
            smallGroup: true,
            site: true,
            submittedBy: true,
            reviewedBy: true,
            activityType: true,
          },
        });

        // 2. Integrated Audit Log
        const { logReportRejection } = await import('./auditLogService');
        await logReportRejection(
          rejectedById,
          reportId,
          before,
          rejectedReport,
          reason,
          ipAddress,
          userAgent,
          tx
        );

        // 3. Notify Submitter
        await notificationService.notifyReportRejected(
          rejectedReport.submittedById,
          rejectedReport.title,
          rejectedReport.id,
          reason,
          tx
        );

        return mapPrismaReportToModel(rejectedReport);
      }, { timeout: 20000 });
    });

    return { success: true, data: result as ReportWithDetails };
  } catch (error: any) {
    console.error(`[ReportService] Rejection Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}
