// src/services/transactionService.ts
import { supabase } from '@/lib/supabaseClient';
import type { FinancialTransaction, User, TransactionFormData } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';

// Helper to convert DB snake_case to frontend camelCase
const toTransactionModel = (dbTransaction: any): FinancialTransaction => {
  return {
    id: dbTransaction.id,
    date: dbTransaction.date,
    description: dbTransaction.description,
    amount: dbTransaction.amount,
    type: dbTransaction.type,
    category: dbTransaction.category,
    siteId: dbTransaction.site_id,
    siteName: dbTransaction.sites?.name,
    smallGroupId: dbTransaction.small_group_id,
    smallGroupName: dbTransaction.small_groups?.name,
    recordedById: dbTransaction.recorded_by,
    recordedByName: dbTransaction.profiles?.name,
    recordedByRole: dbTransaction.profiles?.role,
  };
};

const baseSelectQuery = `
  *,
  profiles:recorded_by(name, role),
  sites:site_id(name),
  small_groups:small_group_id(name)
`;

export interface TransactionFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: DateFilterValue;
  typeFilter?: 'income' | 'expense';
}

export const transactionService = {
  getTransactionById: async (id: string): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
      .from('transactions')
      .select(baseSelectQuery)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Transaction not found.');
    }
    return toTransactionModel(data);
  },

  getFilteredTransactions: async (filters: TransactionFilters): Promise<FinancialTransaction[]> => {
    const { user, entity, searchTerm, dateFilter, typeFilter } = filters;
    if (!user && !entity) throw new Error('Authentication or entity required');

    let query = supabase.from('transactions').select(baseSelectQuery);

    if (entity) {
      if (entity.type === 'site') {
        query = query.eq('site_id', entity.id);
      } else {
        query = query.eq('small_group_id', entity.id);
      }
    } else if (user) {
      // Role-based filtering
      switch (user.role) {
        case 'site_coordinator':
          if (user.siteId) {
            query = query.eq('site_id', user.siteId);
          }
          break;
        case 'small_group_leader':
          if (user.smallGroupId) {
            query = query.eq('small_group_id', user.smallGroupId);
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
      if (startDate) query = query.gte('date', startDate.toISOString());
      if (endDate) query = query.lte('date', endDate.toISOString());
    }

    if (searchTerm) {
      query = query.ilike('description', `%${searchTerm}%`);
    }

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(toTransactionModel);
  },

  createTransaction: async (formData: TransactionFormData): Promise<FinancialTransaction> => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: formData.type,
        category: formData.category,
        amount: formData.amount,
        date: formData.date,
        description: formData.description,
        site_id: formData.siteId,
        small_group_id: formData.smallGroupId,
        recorded_by: formData.recordedById,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create transaction.');
    }
    return transactionService.getTransactionById(data.id);
  },

  updateTransaction: async (id: string, formData: Partial<TransactionFormData>): Promise<FinancialTransaction> => {
    const { error } = await supabase
      .from('transactions')
      .update({
        type: formData.type,
        category: formData.category,
        amount: formData.amount,
        date: formData.date,
        description: formData.description,
        site_id: formData.siteId,
        small_group_id: formData.smallGroupId,
      })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
    return transactionService.getTransactionById(id);
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  },
};


