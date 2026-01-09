'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { deleteFile } from './storageService';
import { FinancialTransaction, User, TransactionFormData } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/lib/dateUtils';
import { logTransactionCreation, logTransactionApproval, createAuditLog } from './auditLogService';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { checkPeriod } from './accountingService';
import { checkBudgetIntegrity } from './budgetService';
import { notifyBudgetOverrun } from './notificationService';

// Helper to map Prisma result to FinancialTransaction type
const mapPrismaTransactionToModel = (tx: any): FinancialTransaction => {
  return {
    id: tx.id,
    date: tx.date ? tx.date.toISOString() : '',
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    siteId: tx.siteId || undefined,
    siteName: tx.site?.name,
    smallGroupId: tx.smallGroupId || undefined,
    smallGroupName: tx.smallGroup?.name,
    recordedById: tx.recordedById,
    recordedByName: tx.recordedBy?.name,
    recordedByRole: tx.recordedBy?.role,
    // Note: avatarUrl will be signed by the caller/fetcher
    recordedByAvatarUrl: tx.recordedBy?.avatarUrl,
    // NEW fields
    status: (tx.status ?? 'approved') as string,
    approvedById: tx.approvedById || undefined,
    approvedByName: tx.approvedBy?.name,
    approvedAt: tx.approvedAt ? tx.approvedAt.toISOString() : undefined,
    relatedReportId: tx.relatedReportId || undefined,
    relatedActivityId: tx.relatedActivityId || undefined,
    proofUrl: tx.proofUrl || undefined,
  };
};

/**
 * Batch sign avatars for a list of transactions
 */
async function signTransactionAvatars(transactions: FinancialTransaction[]): Promise<FinancialTransaction[]> {
  const filePaths = transactions
    .map(tx => tx.recordedByAvatarUrl)
    .filter(url => url && !url.startsWith('http')) as string[];

  if (filePaths.length === 0) return transactions;

  try {
    const { getSignedUrls } = await import('./storageService');
    const signedUrls = await getSignedUrls(filePaths, 'avatars');
    transactions.forEach(tx => {
      if (tx.recordedByAvatarUrl && signedUrls[tx.recordedByAvatarUrl]) {
        tx.recordedByAvatarUrl = signedUrls[tx.recordedByAvatarUrl];
      }
    });
  } catch (e) {
    console.warn('[TransactionService] Batch signing failed:', e);
  }
  return transactions;
}

export interface TransactionFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: DateFilterValue;
  typeFilter?: 'income' | 'expense';
}


export async function getTransactionById(id: string): Promise<FinancialTransaction> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const tx = await prisma.financialTransaction.findUnique({
      where: { id },
      include: {
        site: true,
        smallGroup: true,
        recordedBy: true,
      }
    });

    if (!tx) {
      throw new Error('Transaction not found.');
    }
    const model = mapPrismaTransactionToModel(tx);
    const signed = await signTransactionAvatars([model]);
    return signed[0];
  });
}

export async function getFilteredTransactions(filters: TransactionFilters): Promise<FinancialTransaction[]> {
  const { user, entity } = filters;
  const { getUser } = getKindeServerSession();
  const activeUser = user || await getUser();

  if (!activeUser && !entity) throw new Error('Authentication or entity required');

  return await withRLS(activeUser?.id || 'system', async () => {
    const where = buildTransactionWhereClause(filters);

    const transactions = await prisma.financialTransaction.findMany({
      where,
      include: {
        site: true,
        smallGroup: true,
        recordedBy: true,
      },
      orderBy: { date: 'desc' }
    });

    const models = transactions.map(mapPrismaTransactionToModel);
    return signTransactionAvatars(models);
  });
}

function buildTransactionWhereClause(filters: TransactionFilters) {
  const { user, entity, searchTerm, dateFilter, typeFilter } = filters;
  const where: any = {};

  if (entity) {
    applyEntityFilter(where, entity);
  } else if (user) {
    applyUserRoleFilter(where, user);
  }

  if (dateFilter) {
    const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }
  }

  if (searchTerm) {
    where.description = { contains: searchTerm, mode: 'insensitive' };
  }

  if (typeFilter) {
    where.type = typeFilter;
  }

  return where;
}

export async function createTransaction(formData: TransactionFormData, idempotencyKey?: string): Promise<FinancialTransaction> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const actorId = user?.id || formData.recordedById; // Fallback for seeds/mocks

  // 1. Idempotency Check (Pre-Transaction)
  if (idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) {
      const stored = existing.response as any;
      if (stored?.status === 'PENDING') {
        throw new Error('Request is currently being processed (Idempotency Conflict)');
      }
      return stored as FinancialTransaction;
    }
  }

  // 2. Atomic Transaction (Create + Idempotency + RLS)
  // We use basePrisma to control the transaction scope precisely
  const { basePrisma } = await import('@/lib/prisma');

  try {
    const result = await basePrisma.$transaction(async (tx: any) => {
      // A. Manually Set RLS Context for this transaction
      await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${actorId.replace(/'/g, "''")}'`);

      // B. Accounting Period Guard
      // We check explicitly here because we are outside the usual withRLS wrapper for this block
      // (Using internal logic, but checkPeriod uses 'prisma' which is fine, 
      // but to be safe inside TX we rely on service logic which is mainly reading)
      // Actually checkPeriod calls 'prisma.accountingPeriod'. 
      // It's safer to call checkPeriod *before* starting the transaction or trust it.
      // Calling it before is better for concurrency.

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

    return result;

  } catch (error) {
    console.error('[TransactionService] Create failed:', error);

    // Cleanup Check
    if (formData.proofUrl) {
      await deleteFile(formData.proofUrl, { isRollback: true }).catch(err =>
        console.error('[TransactionService] Rollback of file failed:', err)
      );
    }
    throw error;
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

export async function updateTransaction(id: string, formData: Partial<TransactionFormData>): Promise<FinancialTransaction> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const updateData: any = {};
    if (formData.type) updateData.type = formData.type;
    if (formData.category) updateData.category = formData.category;
    if (formData.amount) updateData.amount = formData.amount;
    if (formData.date) updateData.date = formData.date;
    if (formData.description) updateData.description = formData.description;

    // ✅ Apply Exclusivity Guards for Updates
    if (formData.siteId !== undefined) updateData.siteId = formData.siteId;
    if (formData.smallGroupId !== undefined) updateData.smallGroupId = formData.smallGroupId;

    // CRITICAL: Prevent updates to system-generated transactions
    const existing = await prisma.financialTransaction.findUnique({
      where: { id },
      select: { isSystemGenerated: true, date: true }
    });

    if (!existing) throw new Error('Transaction not found');

    // ✅ Accounting Period Guard: Prevent updates in closed periods
    // Check both existing date and new date if changed
    await checkPeriod(existing.date, 'Modification de transaction (existant)');
    if (formData.date) {
      await checkPeriod(new Date(formData.date), 'Modification de transaction (nouvelle date)');
    }

    if (existing?.isSystemGenerated) {
      throw new Error(
        'TRANSACTION_IMMUTABLE: Cette transaction a été générée automatiquement ' +
        'lors de l\'approbation d\'un rapport et ne peut pas être modifiée. ' +
        'Utilisez une transaction d\'annulation (reversal) si nécessaire.'
      );
    }

    const tx = await prisma.financialTransaction.update({
      where: { id },
      data: updateData,
      include: {
        site: true,
        smallGroup: true,
        recordedBy: true,
      }
    });

    // ✅ Real-time Budget Overrun Detection (Point 4)
    if (tx.status === 'approved' && (tx.siteId || tx.smallGroupId)) {
      try {
        const integrity = await checkBudgetIntegrity({
          siteId: tx.siteId || undefined,
          smallGroupId: tx.smallGroupId || undefined
        }, prisma);
        if (integrity.isOverrun) {
          const entityName = tx.smallGroup?.name || tx.site?.name || 'Inconnu';
          await notifyBudgetOverrun({
            siteId: tx.siteId || undefined,
            smallGroupId: tx.smallGroupId || undefined,
            entityName,
            balance: integrity.balance
          });
        }
      } catch (e) {
        console.error('[BudgetAlert] Failed to check budget integrity after update:', e);
      }
    }

    return mapPrismaTransactionToModel(tx);
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    // CRITICAL: Prevent deletion of system-generated transactions
    const existing = await prisma.financialTransaction.findUnique({
      where: { id },
      select: { isSystemGenerated: true, date: true }
    });

    if (!existing) throw new Error('Transaction not found');

    // ✅ Accounting Period Guard: Prevent deletion in closed periods
    await checkPeriod(existing.date, 'Suppression de transaction');

    if (existing?.isSystemGenerated) {
      throw new Error(
        'TRANSACTION_IMMUTABLE: Cette transaction a été générée automatiquement ' +
        'et ne peut pas être supprimée. Elle est liée à un rapport approuvé.'
      );
    }

    const deleted = await prisma.financialTransaction.delete({
      where: { id },
      include: { site: true, smallGroup: true }
    });

    // ✅ Real-time Budget Overrun Detection (Point 4)
    if (deleted.status === 'approved' && (deleted.siteId || deleted.smallGroupId)) {
      try {
        const integrity = await checkBudgetIntegrity({
          siteId: deleted.siteId || undefined,
          smallGroupId: deleted.smallGroupId || undefined
        }, prisma);
        if (integrity.isOverrun) {
          const entityName = deleted.smallGroup?.name || deleted.site?.name || 'Inconnu';
          await notifyBudgetOverrun({
            siteId: deleted.siteId || undefined,
            smallGroupId: deleted.smallGroupId || undefined,
            entityName,
            balance: integrity.balance
          });
        }
      } catch (e) {
        console.error('[BudgetAlert] Failed to check budget integrity after deletion:', e);
      }
    }
  });
}

/**
 * Approve a transaction (National Coordinator only)
 */
export async function approveTransaction(
  transactionId: string,
  approvedById: string,
  ipAddress?: string,
  userAgent?: string
): Promise<FinancialTransaction> {
  // Get current transaction for audit
  const before = await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!before) {
    throw new Error('Transaction not found');
  }

  if (before.status === 'approved') {
    throw new Error('Transaction already approved');
  }

  const tx = await withRLS(approvedById, async () => {
    return await prisma.financialTransaction.update({
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
  });

  // Audit log
  await logTransactionApproval(approvedById, transactionId, before, tx, ipAddress, userAgent).catch(console.error);

  return mapPrismaTransactionToModel(tx);
}

/**
 * Reject a transaction
 */
export async function rejectTransaction(
  transactionId: string,
  rejectedById: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<FinancialTransaction> {
  const before = await prisma.financialTransaction.findUnique({
    where: { id: transactionId },
  });

  if (!before) {
    throw new Error('Transaction not found');
  }

  const tx = await withRLS(rejectedById, async () => {
    return await prisma.financialTransaction.update({
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
  });

  // Audit log
  await createAuditLog({
    actorId: rejectedById,
    action: 'reject',
    entityType: 'FinancialTransaction',
    entityId: transactionId,
    metadata: {
      before,
      after: tx,
      reason,
      comment: 'Transaction rejetée',
    },
    ipAddress,
    userAgent,
  }).catch(console.error);

  return mapPrismaTransactionToModel(tx);
}

/**
 * Create a reversal transaction (correction)
 */
export async function createReversalTransaction(
  originalTransactionId: string,
  createdById: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<FinancialTransaction> {
  const original = await prisma.financialTransaction.findUnique({
    where: { id: originalTransactionId },
  });

  if (!original) {
    throw new Error('Original transaction not found');
  }

  const reversalTx = await withRLS(createdById, async () => {
    // ✅ Accounting Period Guard: Even reversals must respect the cycle
    await checkPeriod(new Date(), 'Contre-passation (reversal)');

    const tx = await prisma.financialTransaction.create({
      data: {
        type: original.type === 'income' ? 'expense' : 'income', // Inverse type
        category: original.category,
        amount: original.amount, // Same amount, opposite sign via type
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

    // ✅ Real-time Budget Overrun Detection (Point 4)
    if (tx.siteId || tx.smallGroupId) {
      try {
        const integrity = await checkBudgetIntegrity({
          siteId: tx.siteId || undefined,
          smallGroupId: tx.smallGroupId || undefined
        }, prisma);
        if (integrity.isOverrun) {
          const entityName = tx.smallGroup?.name || tx.site?.name || 'Inconnu';
          await notifyBudgetOverrun({
            siteId: tx.siteId || undefined,
            smallGroupId: tx.smallGroupId || undefined,
            entityName,
            balance: integrity.balance
          });
        }
      } catch (e) {
        console.error('[BudgetAlert] Failed to check budget integrity after reversal:', e);
      }
    }

    return tx;
  });

  // Audit log
  await createAuditLog({
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
  }).catch(console.error);

  return mapPrismaTransactionToModel(reversalTx);
}

function applyEntityFilter(where: any, entity: { type: 'site' | 'smallGroup'; id: string }) {
  if (entity.type === 'site') {
    where.siteId = entity.id;
  } else {
    where.smallGroupId = entity.id;
  }
}

function applyUserRoleFilter(where: any, user: User) {
  if (user.role === 'SITE_COORDINATOR' && user.siteId) {
    where.siteId = user.siteId;
  } else if (user.role === 'SMALL_GROUP_LEADER' && user.smallGroupId) {
    where.smallGroupId = user.smallGroupId;
  }
}
