'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { ServiceResponse, FinancialTransaction } from '@/lib/types';
import { checkPeriod } from '../accountingService';
import { checkBudgetIntegrity } from '../budgetService';
import { notifyBudgetOverrun } from '../notificationService';
import { logTransactionApproval } from '../auditLogService';
import { mapPrismaTransactionToModel } from './shared';

export async function approveTransaction(
    transactionId: string,
    approvedById: string,
    ipAddress?: string,
    userAgent?: string
): Promise<ServiceResponse<FinancialTransaction>> {
    try {
        const { basePrisma } = await import('@/lib/prisma');

        const result = await basePrisma.$transaction(async (tx: any) => {
            // 1. Manually set RLS Context
            await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${approvedById}'`);

            // 2. Fetch current transaction for audit and guard
            const before = await tx.financialTransaction.findUnique({
                where: { id: transactionId },
            });

            if (!before) throw new Error('Transaction not found');
            if (before.status === 'approved') throw new Error('Transaction already approved');

            // ✅ Accounting Period Guard
            await checkPeriod(before.date, 'Approbation de transaction');

            // 3. Mutation
            const updated = await tx.financialTransaction.update({
                where: { id: transactionId },
                data: {
                    status: 'approved',
                    approvedById,
                    approvedAt: new Date(),
                },
                include: {
                    site: true,
                    smallGroup: true,
                    recordedBy: true,
                    approvedBy: true,
                },
            });

            // 4. Audit Log inside transaction
            await logTransactionApproval(approvedById, transactionId, before, updated, ipAddress, userAgent, tx);

            return mapPrismaTransactionToModel(updated);
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error(`[TransactionService] Approval failed: ${error.message}`);
        return { success: false, error: { message: error.message } };
    }
}

export async function rejectTransaction(
    transactionId: string,
    rejectedById: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
): Promise<ServiceResponse<FinancialTransaction>> {
    try {
        const { basePrisma } = await import('@/lib/prisma');

        const result = await basePrisma.$transaction(async (tx: any) => {
            // 1. Manually set RLS Context
            await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${rejectedById}'`);

            // 2. Fetch before
            const before = await tx.financialTransaction.findUnique({
                where: { id: transactionId },
            });

            if (!before) throw new Error('Transaction not found');

            // ✅ Accounting Period Guard
            await checkPeriod(before.date, 'Rejet de transaction');

            // 3. Mutation
            const updated = await tx.financialTransaction.update({
                where: { id: transactionId },
                data: {
                    status: 'rejected',
                },
                include: {
                    site: true,
                    smallGroup: true,
                    recordedBy: true,
                    approvedBy: true,
                },
            });

            // 4. Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: rejectedById,
                    action: 'reject',
                    entityType: 'FinancialTransaction',
                    entityId: transactionId,
                    metadata: {
                        before,
                        after: updated,
                        reason,
                        comment: 'Transaction rejetée',
                    },
                    ipAddress,
                    userAgent,
                    createdAt: new Date()
                }
            });

            return mapPrismaTransactionToModel(updated);
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error(`[TransactionService] Rejection failed: ${error.message}`);
        return { success: false, error: { message: error.message } };
    }
}

export async function createReversalTransaction(
    originalTransactionId: string,
    createdById: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
): Promise<ServiceResponse<FinancialTransaction>> {
    try {
        const { basePrisma } = await import('@/lib/prisma');

        const result = await basePrisma.$transaction(async (tx: any) => {
            // 1. Manually set RLS Context
            await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${createdById}'`);

            // 2. Fetch original
            const original = await tx.financialTransaction.findUnique({
                where: { id: originalTransactionId },
            });

            if (!original) throw new Error('Original transaction not found');

            // 3. Accounting Period Guard
            await checkPeriod(new Date(), 'Contre-passation (reversal)');

            // 4. Mutation
            const reversalTx = await tx.financialTransaction.create({
                data: {
                    type: original.type === 'income' ? 'expense' : 'income',
                    category: original.category,
                    amount: original.amount,
                    date: new Date(),
                    description: `ANNULATION: ${original.description}`,
                    siteId: original.siteId,
                    smallGroupId: original.smallGroupId,
                    recordedById: createdById,
                    status: 'approved',
                    approvedById: createdById,
                    approvedAt: new Date(),
                    isReversalOfId: originalTransactionId,
                    proofUrl: original.proofUrl,
                },
                include: {
                    site: true,
                    smallGroup: true,
                    recordedBy: true,
                    approvedBy: true,
                },
            });

            // 5. Audit log
            await tx.auditLog.create({
                data: {
                    actorId: createdById,
                    action: 'reverse',
                    entityType: 'FinancialTransaction',
                    entityId: reversalTx.id,
                    metadata: {
                        originalTransactionId,
                        reason,
                        comment: 'Transaction annulée par contre-passation',
                    },
                    ipAddress,
                    userAgent,
                    createdAt: new Date()
                }
            });

            // 6. Real-time Budget Overrun Detection
            if (reversalTx.siteId || reversalTx.smallGroupId) {
                try {
                    const integrity = await checkBudgetIntegrity({
                        siteId: reversalTx.siteId || undefined,
                        smallGroupId: reversalTx.smallGroupId || undefined
                    }, tx);
                    if (integrity.isOverrun) {
                        const entityName = reversalTx.smallGroup?.name || reversalTx.site?.name || 'Inconnu';
                        await notifyBudgetOverrun({
                            siteId: reversalTx.siteId || undefined,
                            smallGroupId: reversalTx.smallGroupId || undefined,
                            entityName,
                            balance: integrity.balance,
                            tx
                        });
                    }
                } catch (e) {
                    console.error('[BudgetAlert] Failed to check budget integrity after reversal:', e);
                }
            }

            return mapPrismaTransactionToModel(reversalTx);
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error(`[TransactionService] Reversal failed: ${error.message}`);
        return { success: false, error: { message: error.message } };
    }
}
