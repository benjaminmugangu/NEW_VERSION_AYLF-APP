'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { ServiceResponse, ReportWithDetails, ReportFormData } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import notificationService from '../notificationService';
import { deleteFile, extractFilePath } from '../storageService';
import { checkPeriod } from '../accountingService';
import { mapPrismaReportToModel, mapUpdateDataFields } from './shared';

export async function createReport(reportData: ReportFormData, overrideUser?: any): Promise<ServiceResponse<ReportWithDetails>> {
    const { getUser } = getKindeServerSession();
    const user = overrideUser || await getUser();

    if (!user?.id) {
        throw new Error('Unauthorized');
    }

    // Idempotency Check (Pre-Transaction) done via basePrisma access inside dynamic import?
    // Original code used basePrisma at line 180.
    const { basePrisma } = await import('@/lib/prisma');

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
                        // smallGroup: { select: { level: true } } // Why did I assume simple include? Original was `smallGroup: true`.
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

        const { basePrisma } = await import('@/lib/prisma');

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

export async function deleteReport(id: string): Promise<ServiceResponse<void>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user?.id) return { success: false, error: { message: 'Unauthorized' } };

        const { basePrisma } = await import('@/lib/prisma');

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
