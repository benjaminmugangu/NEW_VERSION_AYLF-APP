// src/services/transactionService.ts
import { supabase } from '@/lib/supabaseClient';
import type { FinancialTransaction, ServiceResponse, User, TransactionFormData } from '@/lib/types';
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
  typeFilter?: 'income' | 'expense' | 'all';
}

export const transactionService = {
  getTransactionById: async (id: string): Promise<ServiceResponse<FinancialTransaction>> => {
    const { data, error } = await supabase
      .from('transactions')
      .select(baseSelectQuery)
      .eq('id', id)
      .single();

    if (error) {

      return { success: false, error: { message: 'Transaction not found.' } };
    }
    return { success: true, data: toTransactionModel(data) };
  },

  getFilteredTransactions: async (filters: TransactionFilters): Promise<ServiceResponse<FinancialTransaction[]>> => {
    const { user, entity, searchTerm, dateFilter, typeFilter } = filters;
    if (!user && !entity) return { success: false, error: { message: 'Authentication or entity required' } };

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

    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {

      return { success: false, error: { message: error.message } };
    }

    const transactions = data.map(toTransactionModel);
    return { success: true, data: transactions };
  },

  createTransaction: async (formData: TransactionFormData): Promise<ServiceResponse<FinancialTransaction>> => {
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

    if (error) {

      return { success: false, error: { message: error.message } };
    }
    return transactionService.getTransactionById(data.id);
  },

  updateTransaction: async (id: string, formData: Partial<TransactionFormData>): Promise<ServiceResponse<FinancialTransaction>> => {
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

      return { success: false, error: { message: error.message } };
    }
    return transactionService.getTransactionById(id);
  },

  deleteTransaction: async (id: string): Promise<ServiceResponse<null>> => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: null };
  },
};


