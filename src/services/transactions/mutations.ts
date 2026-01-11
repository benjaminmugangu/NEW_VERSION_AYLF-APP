'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { TransactionFormData, ServiceResponse, FinancialTransaction } from '@/lib/types';
import { checkPeriod } from '../accountingService';
import { deleteFile } from '../storageService';
import { logTransactionCreation } from '../auditLogService';
import { checkBudgetIntegrity } from '../budgetService';
import { notifyBudgetOverrun } from '../notificationService';
import { mapPrismaTransactionToModel } from './shared';

export async function createTransaction(formData: TransactionFormData, idempotencyKey?: string): Promise<ServiceResponse<FinancialTransaction>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        const actorId = user?.id || formData.recordedById; // Fallback for seeds/mocks

        // 1. Idempotency Check (Pre-Transaction)
        if (idempotencyKey) {
            const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
            if (existing) {
                const stored = existing.response as any;
                if (stored?.status === 'PENDING') {
                    return { success: false, error: { message: 'Request is currently being processed (Idempotency Conflict)' } };
                }
                return { success: true, data: stored as FinancialTransaction };
            }
        }

        // 2. Atomic Transaction (Create + Idempotency + RLS)
        // We use basePrisma to control the transaction scope precisely
        const { basePrisma } = await import('@/lib/prisma');

        const result = await basePrisma.$transaction(async (tx: any) => {
            // A. Manually Set RLS Context for this transaction
            await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${actorId.replace(/'/g, "''")}'`);

            // B. Accounting Period Guard
            // Performing check inside transaction via service logic (safe as periods change rarely)
            await checkPeriod(new Date(formData.date), 'Création de transaction');

            // C. Resolve Context
            const { siteId, smallGroupId } = await resolveTransactionContext(formData);

            // D. Create Transaction
            const createdTx = await tx.financialTransaction.create({
                data: {
                    type: formData.type,
                    category: formData.category,
                    amount: formData.amount,
                    date: formData.date,
                    description: formData.description,
                    siteId,
                    smallGroupId,
                    recordedById: formData.recordedById,
                    status: (formData.status || 'approved') as any, // Cast to any to satisfy Prisma enum type
                    approvedById: formData.status === 'approved' ? formData.recordedById : undefined,
                    approvedAt: formData.status === 'approved' ? new Date() : undefined,
                    proofUrl: formData.proofUrl,
                    relatedActivityId: formData.relatedActivityId,
                    relatedReportId: formData.relatedReportId,
                },
                include: {
                    site: true,
                    smallGroup: true,
                    recordedBy: true,
                    approvedBy: true,
                }
            });

            const model = mapPrismaTransactionToModel(createdTx);

            // E. Update/Create Idempotency Key
            if (idempotencyKey) {
                await tx.idempotencyKey.upsert({
                    where: { key: idempotencyKey },
                    create: {
                        key: idempotencyKey,
                        response: model as any
                    },
                    update: {
                        response: model as any
                    }
                });
            }

            return model;
        });

        // 3. Post-Commit Side Effects (Non-Blocking)
        // Audit Log
        await logTransactionCreation(formData.recordedById, result.id, result).catch(console.error);

        // Real-time Budget Overrun Detection
        if (result.status === 'approved' && (result.siteId || result.smallGroupId)) {
            try {
                const integrity = await checkBudgetIntegrity({
                    siteId: result.siteId || undefined,
                    smallGroupId: result.smallGroupId || undefined
                }, prisma);
                if (integrity.isOverrun) {
                    const entityName = result.smallGroupName || result.siteName || 'Inconnu';
                    await notifyBudgetOverrun({
                        siteId: result.siteId || undefined,
                        smallGroupId: result.smallGroupId || undefined,
                        entityName,
                        balance: integrity.balance
                    });
                }
            } catch (e) {
                console.error('[BudgetAlert] Failed to check budget integrity after creation:', e);
            }
        }

        return { success: true, data: result };

    } catch (error: any) {
        console.error('[TransactionService] Create failed:', error);

        // Cleanup Check
        if (formData.proofUrl) {
            await deleteFile(formData.proofUrl, { isRollback: true }).catch(err =>
                console.error('[TransactionService] Rollback of file failed:', err)
            );
        }
        return { success: false, error: { message: error.message } };
    }
}

export async function updateTransaction(id: string, formData: Partial<TransactionFormData>): Promise<ServiceResponse<FinancialTransaction>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized' } };

        const { basePrisma } = await import('@/lib/prisma');

        const result = await withRLS(user.id, async () => {
            return await basePrisma.$transaction(async (tx: any) => {
                // 1. Manually set RLS context
                await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

                // 2. Fetch existing transaction inside transaction
                const existing = await tx.financialTransaction.findUnique({
                    where: { id },
                    select: { isSystemGenerated: true, date: true, type: true, category: true, amount: true, description: true, siteId: true, smallGroupId: true }
                });

                if (!existing) throw new Error('Transaction not found');

                // ✅ Accounting Period Guard: Prevent updates in closed periods
                await checkPeriod(existing.date, 'Modification de transaction (existant)');
                if (formData.date) {
                    await checkPeriod(new Date(formData.date), 'Modification de transaction (nouvelle date)');
                }

                // ✅ Immutability Guard
                if (existing.isSystemGenerated) {
                    throw new Error(
                        'TRANSACTION_IMMUTABLE: Cette transaction a été générée automatiquement ' +
                        'lors de l\'approbation d\'un rapport et ne peut pas être modifiée.'
                    );
                }

                const updateData: any = {};
                if (formData.type) updateData.type = formData.type;
                if (formData.category) updateData.category = formData.category;
                if (formData.amount !== undefined) updateData.amount = formData.amount;
                if (formData.date) updateData.date = formData.date;
                if (formData.description) updateData.description = formData.description;
                if (formData.siteId !== undefined) updateData.siteId = formData.siteId;
                if (formData.smallGroupId !== undefined) updateData.smallGroupId = formData.smallGroupId;

                const updated = await tx.financialTransaction.update({
                    where: { id },
                    data: updateData,
                    include: { site: true, smallGroup: true, recordedBy: true }
                });

                // 3. Audit Log inside transaction
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'update',
                        entityType: 'FinancialTransaction',
                        entityId: id,
                        metadata: { before: existing, after: updated },
                        createdAt: new Date()
                    }
                });

                // ✅ Real-time Budget Overrun Detection
                if (updated.status === 'approved' && (updated.siteId || updated.smallGroupId)) {
                    try {
                        const integrity = await checkBudgetIntegrity({
                            siteId: updated.siteId || undefined,
                            smallGroupId: updated.smallGroupId || undefined
                        }, tx);
                        if (integrity.isOverrun) {
                            const entityName = updated.smallGroup?.name || updated.site?.name || 'Inconnu';
                            await notifyBudgetOverrun({
                                siteId: updated.siteId || undefined,
                                smallGroupId: updated.smallGroupId || undefined,
                                entityName,
                                balance: integrity.balance,
                                tx
                            });
                        }
                    } catch (e) {
                        console.error('[BudgetAlert] Failed to check budget integrity after update:', e);
                    }
                }

                return mapPrismaTransactionToModel(updated);
            }, { timeout: 15000 });
        });

        return { success: true, data: result };
    } catch (error: any) {
        console.error(`[TransactionService] Update Error: ${error.message}`);
        return { success: false, error: { message: error.message } };
    }
}

export async function deleteTransaction(id: string): Promise<ServiceResponse<void>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized' } };

        const { basePrisma } = await import('@/lib/prisma');

        await withRLS(user.id, async () => {
            return await basePrisma.$transaction(async (tx: any) => {
                // 1. Manually set RLS context
                await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

                // 2. Fetch targets inside transaction
                const existing = await tx.financialTransaction.findUnique({
                    where: { id },
                    select: { isSystemGenerated: true, date: true, amount: true, status: true, siteId: true, smallGroupId: true }
                });

                if (!existing) throw new Error('Transaction not found');

                // ✅ Accounting Period Guard
                await checkPeriod(existing.date, 'Suppression de transaction');

                // ✅ Immutability Guard
                if (existing.isSystemGenerated) {
                    throw new Error(
                        'TRANSACTION_IMMUTABLE: Cette transaction a été générée automatiquement ' +
                        'et ne peut pas être supprimée.'
                    );
                }

                // 3. Mutation
                const deleted = await tx.financialTransaction.delete({
                    where: { id },
                    include: { site: true, smallGroup: true }
                });

                // 4. Audit Log
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'delete',
                        entityType: 'FinancialTransaction',
                        entityId: id,
                        metadata: { before: existing, comment: 'Transaction supprimée' },
                        createdAt: new Date()
                    }
                });

                // ✅ Real-time Budget Overrun Detection
                if (deleted.status === 'approved' && (deleted.siteId || deleted.smallGroupId)) {
                    try {
                        const integrity = await checkBudgetIntegrity({
                            siteId: deleted.siteId || undefined,
                            smallGroupId: deleted.smallGroupId || undefined
                        }, tx);
                        if (integrity.isOverrun) {
                            const entityName = deleted.smallGroup?.name || deleted.site?.name || 'Inconnu';
                            await notifyBudgetOverrun({
                                siteId: deleted.siteId || undefined,
                                smallGroupId: deleted.smallGroupId || undefined,
                                entityName,
                                balance: integrity.balance,
                                tx
                            });
                        }
                    } catch (e) {
                        console.error('[BudgetAlert] Failed to check budget integrity after deletion:', e);
                    }
                }
            }, { timeout: 15000 });
        });

        return { success: true };
    } catch (error: any) {
        console.error(`[TransactionService] Delete Error: ${error.message}`);
        return { success: false, error: { message: error.message } };
    }
}

/** Helper to resolve site/group context from related activity if present */
async function resolveTransactionContext(formData: TransactionFormData) {
    let { siteId, smallGroupId } = formData;

    if (formData.relatedActivityId) {
        const activity = await prisma.activity.findUnique({
            where: { id: formData.relatedActivityId },
            select: { level: true, siteId: true, smallGroupId: true }
        });

        if (activity) {
            if (activity.level === 'national') return { siteId: undefined, smallGroupId: undefined };
            if (activity.level === 'site') return { siteId: activity.siteId || siteId, smallGroupId: undefined };
            return { siteId: activity.siteId || siteId, smallGroupId: activity.smallGroupId || smallGroupId };
        }
    }

    return { siteId, smallGroupId };
}
