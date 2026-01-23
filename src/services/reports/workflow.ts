'use server';

import { withRLS } from '@/lib/prisma';
import { ServiceResponse, ReportWithDetails } from '@/lib/types';
import { checkPeriod } from '../accountingService';
import { checkBudgetIntegrity } from '../budgetService';
import { notifyBudgetOverrun, notifyReportApproved, notifyReportRejected } from '../notificationService';
import { logReportApproval, logReportRejection } from '../auditLogService';
import { mapPrismaReportToModel } from './shared';

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
        const { basePrisma } = await import('@/lib/prisma');

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
            const submitterId = approvedReport.submittedById || (approvedReport.submittedBy as any)?.id;
            console.log(`[approveReport] Notifying submitter: ${submitterId} for report: ${approvedReport.id}`);
            try {
                if (!submitterId) throw new Error('No submitter ID found for notification');

                const notificationResult = await notifyReportApproved(
                    submitterId,
                    approvedReport.title,
                    approvedReport.id,
                    tx
                );
                console.log(`[approveReport] Notification created: ${notificationResult.id}`);
            } catch (notifError: any) {
                console.error(`[approveReport] Failed to send notification: ${notifError.message}`);
                // Don't fail the whole transaction if notification fails, but log it
            }

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

            const finalModel = await mapPrismaReportToModel(approvedReport);
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
        const { basePrisma } = await import('@/lib/prisma');

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
                const submitterId = rejectedReport.submittedById || (rejectedReport.submittedBy as any)?.id;
                console.log(`[rejectReport] Notifying submitter: ${submitterId} for report: ${rejectedReport.id}`);
                try {
                    if (!submitterId) throw new Error('No submitter ID found for notification');

                    const notificationResult = await notifyReportRejected(
                        submitterId,
                        rejectedReport.title,
                        rejectedReport.id,
                        reason,
                        tx
                    );
                    console.log(`[rejectReport] Notification created: ${notificationResult.id}`);
                } catch (notifError: any) {
                    console.error(`[rejectReport] Failed to send notification: ${notifError.message}`);
                }

                return await mapPrismaReportToModel(rejectedReport);
            }, { timeout: 20000 });
        });

        return { success: true, data: result as ReportWithDetails };
    } catch (error: any) {
        console.error(`[ReportService] Rejection Error: ${error.message}`);
        return { success: false, error: { message: error.message } };
    }
}
