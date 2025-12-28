'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Report, ReportWithDetails, ReportFormData, User } from '@/lib/types';
import { logReportApproval, createAuditLog } from './auditLogService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { deleteFile } from './storageService';

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
    siteName: report.site?.name,
    smallGroupName: report.smallGroup?.name,
  };
};

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

    return mapPrismaReportToModel(report);
  });
}

export async function createReport(reportData: ReportFormData, overrideUser?: any): Promise<Report> {
  const { getUser } = getKindeServerSession();
  const user = overrideUser || await getUser();

  if (!user?.id) {
    throw new Error('Unauthorized');
  }

  return await withRLS(user.id, async () => {
    // Mutual Exclusivity & Level Validation
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
      const report = await prisma.report.create({
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

      return mapPrismaReportToModel(report);

    } catch (dbError) {
      // ATOMIC ROLLBACK STRATEGY
      console.error('[CreateReport] Database failure, initiating rollback for uploaded assets...', dbError);

      const rollbackQueue = [];

      // 1. Rollback Images
      if (Array.isArray(reportData.images)) {
        for (const img of reportData.images) {
          if (img.url) rollbackQueue.push(img.url);
        }
      }

      // 2. Rollback Attachments
      if (Array.isArray(reportData.attachments)) {
        for (const url of reportData.attachments) {
          if (typeof url === 'string') rollbackQueue.push(url);
        }
      }

      // Execute Rollbacks (Best Effort)
      const results = await Promise.allSettled(
        rollbackQueue.map(url => {
          // Extract path from URL roughly or use specific logic? 
          // deleteFile expects filePath (path in bucket), not full URL.
          // Logic: URL usually contains bucket path. 
          // Assuming standard Supabase storage URL format: .../report-images/PATH
          let path = url;
          if (url.includes('/report-images/')) {
            path = url.split('/report-images/')[1];
          }
          if (path) {
            return deleteFile(path, { isRollback: true });
          }
          return Promise.resolve();
        })
      );

      const failedRollbacks = results.filter(r => r.status === 'rejected');
      if (failedRollbacks.length > 0) {
        console.error('[CreateReport] Some rollbacks failed!', failedRollbacks);
      } else if (rollbackQueue.length > 0) {
        console.log(`[CreateReport] Successfully rolled back ${rollbackQueue.length} assets.`);
      }

      throw dbError; // Re-throw to propagate error to client
    }
  });
}

export async function updateReport(reportId: string, updatedData: Partial<ReportFormData>): Promise<ReportWithDetails> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user?.id) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    // If level is changing, enforce exclusivity
    if (updatedData.level === 'national') {
      updatedData.siteId = undefined;
      updatedData.smallGroupId = undefined;
    } else if (updatedData.level === 'site') {
      updatedData.smallGroupId = undefined;
    }

    const updateData = mapUpdateDataFields(updatedData);

    const report = await prisma.report.update({
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

export async function deleteReport(id: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user?.id) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    await prisma.report.delete({
      where: { id },
    });
  });
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

    return reports.map(mapPrismaReportToModel);
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
): Promise<ReportWithDetails> {
  return await withRLS(approvedById, async () => {
    // Get current report for audit
    const before = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        activity: true,
        site: true,
        smallGroup: true,
      },
    });

    if (!before) {
      throw new Error('Report not found');
    }

    if (before.status === 'approved') {
      throw new Error('Report already approved');
    }

    const generatedTransactionIds: string[] = [];

    // Update report and generate transactions in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // ...
      // 1. Mark report as approved
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

      // 2. Mark related activity as executed (if exists)
      if (approvedReport.activityId) {
        await tx.activity.update({
          where: { id: approvedReport.activityId },
          data: { status: 'executed' },
        });
      }

      // 3. Generate FinancialTransaction if there are expenses
      if (approvedReport.totalExpenses && approvedReport.totalExpenses > 0) {
        const transaction = await tx.financialTransaction.create({
          data: {
            type: 'expense',
            category: 'Activity Expense', // Could be more specific based on activityType
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
            // proofUrl: Could link to report's attachments if needed
          },
        });

        generatedTransactionIds.push(transaction.id);
      }

      return approvedReport;
    });

    // Audit log
    await logReportApproval(
      approvedById,
      reportId,
      before,
      result,
      generatedTransactionIds,
      ipAddress,
      userAgent
    ).catch(console.error);

    return mapPrismaReportToModel(result);
  });
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
): Promise<ReportWithDetails> {
  return await withRLS(rejectedById, async () => {
    const before = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!before) {
      throw new Error('Report not found');
    }

    const rejectedReport = await prisma.report.update({
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

    // Audit log
    await createAuditLog({
      actorId: rejectedById,
      action: 'reject',
      entityType: 'Report',
      entityId: reportId,
      metadata: {
        before,
        after: rejectedReport,
        reason,
        comment: 'Rapport rejeté',
      },
      ipAddress,
      userAgent,
    }).catch(console.error);

    return mapPrismaReportToModel(rejectedReport);
  });
}
