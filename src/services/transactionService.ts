'use server';

import { prisma } from '@/lib/prisma';
import { FinancialTransaction, User, TransactionFormData, UserRole } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/lib/dateUtils';

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
      case 'site_coordinator':
        if (user.siteId) {
          where.siteId = user.siteId;
        }
        break;
      case 'small_group_leader':
        if (user.smallGroupId) {
          where.smallGroupId = user.smallGroupId;
        }
        break;
      // national_coordinator sees everything, so no additional filter is needed.
      case 'national_coordinator':
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
  const tx = await prisma.financialTransaction.create({
    data: {
      type: formData.type,
      category: formData.category,
      amount: formData.amount,
      date: formData.date, // Assuming formData.date is Date string or Date object. Prisma expects Date object or ISO string.
      description: formData.description,
      siteId: formData.siteId,
      smallGroupId: formData.smallGroupId,
      recordedById: formData.recordedById,
    },
    include: {
      site: true,
      smallGroup: true,
      recordedBy: true,
    }
  });

  return mapPrismaTransactionToModel(tx);
}

export async function updateTransaction(id: string, formData: Partial<TransactionFormData>): Promise<FinancialTransaction> {
  const updateData: any = {};
  if (formData.type) updateData.type = formData.type;
  if (formData.category) updateData.category = formData.category;
  if (formData.amount) updateData.amount = formData.amount;
  if (formData.date) updateData.date = formData.date;
  if (formData.description) updateData.description = formData.description;
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
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.financialTransaction.delete({
    where: { id },
  });
}
