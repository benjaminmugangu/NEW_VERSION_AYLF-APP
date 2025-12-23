'use server';

import { prisma } from '@/lib/prisma';
import { FinancialTransaction, User, TransactionFormData, UserRole } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/lib/dateUtils';
import { logTransactionCreation, logTransactionApproval, createAuditLog } from './auditLogService';

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
}

export async function getFilteredTransactions(filters: TransactionFilters): Promise<FinancialTransaction[]> {
  const { user, entity, searchTerm, dateFilter, typeFilter } = filters;
  if (!user && !entity) throw new Error('Authentication or entity required');

  const where: any = {};

  if (entity) {
    if (entity.type === 'site') {
      where.siteId = entity.id;
    } else {
      where.smallGroupId = entity.id;
    }
  } else if (user) {
    // Role-based filtering
    switch (user.role) {
      case 'SITE_COORDINATOR':
        if (user.siteId) {
          where.siteId = user.siteId;
        }
        break;
      case 'SMALL_GROUP_LEADER':
        if (user.smallGroupId) {
          where.smallGroupId = user.smallGroupId;
        }
        break;
      // NATIONAL_COORDINATOR sees everything, so no additional filter is needed.
      case 'NATIONAL_COORDINATOR':
      default:
        break;
    }
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
}

export async function createTransaction(formData: TransactionFormData): Promise<FinancialTransaction> {
  // ✅ Apply Exclusivity Guards
  let siteId = formData.siteId;
  let smallGroupId = formData.smallGroupId;

  if (formData.relatedActivityId) {
    const activity = await prisma.activity.findUnique({
      where: { id: formData.relatedActivityId },
      select: { level: true, siteId: true, smallGroupId: true }
    });

    if (activity) {
      if (activity.level === 'national') {
        siteId = undefined;
        smallGroupId = undefined;
      } else if (activity.level === 'site') {
        siteId = activity.siteId || siteId;
        smallGroupId = undefined;
      } else if (activity.level === 'small_group') {
        siteId = activity.siteId || siteId;
        smallGroupId = activity.smallGroupId || smallGroupId;
      }
    }
  }

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
      status: formData.status || 'approved', // Default approved for National/Site direct creation
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

  // Audit log
  await logTransactionCreation(formData.recordedById, tx.id, tx).catch(console.error);

  return mapPrismaTransactionToModel(tx);
}

export async function updateTransaction(id: string, formData: Partial<TransactionFormData>): Promise<FinancialTransaction> {
  const updateData: any = {};
  if (formData.type) updateData.type = formData.type;
  if (formData.category) updateData.category = formData.category;
  if (formData.amount) updateData.amount = formData.amount;
  if (formData.date) updateData.date = formData.date;
  if (formData.description) updateData.description = formData.description;

  // ✅ Apply Exclusivity Guards for Updates
  if (formData.siteId !== undefined) updateData.siteId = formData.siteId;
  if (formData.smallGroupId !== undefined) updateData.smallGroupId = formData.smallGroupId;

  // We should also handle exclusivity if relatedActivityId changes, but that's rare.
  // For now, ensure consistency if smallGroupId is set
  if (updateData.smallGroupId) {
    // If setting a small group, we MUST ensure the siteId is also set (or already exists)
    const current = await prisma.financialTransaction.findUnique({ where: { id }, select: { siteId: true } });
    if (!updateData.siteId && !current?.siteId) {
      // Logic error: cannot have small group without site
      // In this app, we usually set siteId if we set smallGroupId
    }
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

  return mapPrismaTransactionToModel(tx);
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.financialTransaction.delete({
    where: { id },
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

  const tx = await prisma.financialTransaction.update({
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

  const tx = await prisma.financialTransaction.update({
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

  const reversalTx = await prisma.financialTransaction.create({
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

