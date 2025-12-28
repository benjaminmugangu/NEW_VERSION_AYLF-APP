'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { deleteFile } from './storageService';
import { FinancialTransaction, User, TransactionFormData } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/lib/dateUtils';
import { logTransactionCreation, logTransactionApproval, createAuditLog } from './auditLogService';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

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
    return mapPrismaTransactionToModel(tx);
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

    return transactions.map(mapPrismaTransactionToModel);
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
  return await withRLS(formData.recordedById, async () => {
    // 1. Idempotency Check (Lock-First)
    if (idempotencyKey) {
      try {
        await prisma.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            response: { status: 'PENDING', timestamp: Date.now() }
          }
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          const existing = await prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
          if (existing) {
            const stored = existing.response as any;
            if (stored?.status === 'PENDING') {
              throw new Error('Request is currently being processed (Idempotency Conflict)');
            }
            return stored as FinancialTransaction;
          }
        }
        throw err;
      }
    }

    try {
      const { siteId, smallGroupId } = await resolveTransactionContext(formData);

      const tx = await prisma.financialTransaction.create({
        data: {
          type: formData.type,
          category: formData.category,
          amount: formData.amount,
          date: formData.date,
          description: formData.description,
          siteId,
          smallGroupId,
          recordedById: formData.recordedById,
          status: formData.status || 'approved',
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

      await logTransactionCreation(formData.recordedById, tx.id, tx).catch(console.error);
      const result = mapPrismaTransactionToModel(tx);

      // 3. Update Idempotency Key with Result
      if (idempotencyKey) {
        await prisma.idempotencyKey.update({
          where: { key: idempotencyKey },
          data: { response: result as any }
        });
      }

      return result;

    } catch (error) {
      console.error('[TransactionService] Create failed, rolling back assets...', error);

      // Release Lock on Failure
      if (idempotencyKey) {
        await prisma.idempotencyKey.delete({ where: { key: idempotencyKey } }).catch(() => { });
      }

      if (formData.proofUrl) {
        await deleteFile(formData.proofUrl, { isRollback: true }).catch(err =>
          console.error('[TransactionService] Rollback failed:', err)
        );
      }
      throw error;
    }
  });
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

    const tx = await prisma.financialTransaction.update({
      where: { id },
      data: updateData,
      include: {
        site: true,
        smallGroup: true,
        recordedBy: true,
      }
    });

    return mapPrismaTransactionToModel(tx);
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    await prisma.financialTransaction.delete({
      where: { id },
    });
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
    return await prisma.financialTransaction.create({
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
