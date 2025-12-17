
import { prisma } from '@/lib/prisma';

/**
 * Checks if a user can be safely deleted.
 */
export async function checkDeletionEligibility(userId: string): Promise<{ canDelete: boolean; reason?: string }> {
    const [hasReports, hasActivities, hasTransactions] = await Promise.all([
        prisma.report.findFirst({ where: { submittedById: userId } }),
        prisma.activity.findFirst({ where: { createdById: userId } }),
        prisma.financialTransaction.findFirst({ where: { recordedById: userId } })
    ]);

    if (hasReports || hasActivities || hasTransactions) {
        return {
            canDelete: false,
            reason: "Cannot delete user with existing data (Reports, Activities, or Transactions). Please deactivate them instead."
        };
    }
    return { canDelete: true };
}
