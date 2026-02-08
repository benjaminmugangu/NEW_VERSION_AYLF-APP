'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as transactionService from '@/services/transactionService';
import type { TransactionFilters } from '@/services/transactionService';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { FinancialTransaction, TransactionFormData, User } from '@/lib/types';

const defaultDateFilter: DateFilterValue = { rangeKey: 'all_time', display: 'All Time' };

interface UseTransactionsOptions {
  user: User | null;
  initialData?: FinancialTransaction[];
  initialFilters?: Partial<Omit<TransactionFilters, 'user'>>;
}

export const useTransactions = ({ user, initialData, initialFilters = {} }: UseTransactionsOptions) => {
  const queryClient = useQueryClient();

  // Filter states
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialFilters.dateFilter || defaultDateFilter);
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | 'all'>(initialFilters.typeFilter || 'all');

  // Use external date filter if provided, otherwise use internal state
  const activeDateFilter = initialFilters.dateFilter || dateFilter;

  const filters: TransactionFilters = {
    user: user!,
    searchTerm,
    dateFilter: activeDateFilter,
    typeFilter: typeFilter === 'all' ? undefined : typeFilter,
    entity: initialFilters.entity
  };

  const {
    data: transactions,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: async (): Promise<FinancialTransaction[]> => {
      const response = await transactionService.getFilteredTransactions(filters);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch transactions');
      }
      return response.data;
    },
    enabled: !!user,
    staleTime: 0,
  });

  const mutationOptions = {
    onSuccess: () => {
      if (user) {
        // Invalidate the specific query for the transaction list
        queryClient.invalidateQueries({ queryKey: ['transactions', user.id, filters] });
        // Invalidate financials which likely depend on the user
        queryClient.invalidateQueries({ queryKey: ['financials', user.id] });
      }
    },
  };

  const { mutateAsync: createTransaction, isPending: isCreating } = useMutation({
    ...mutationOptions,
    mutationFn: async (formData: TransactionFormData) => {
      const idempotencyKey = crypto.randomUUID();
      const response = await transactionService.createTransaction(formData, idempotencyKey);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create transaction');
      }
      return response.data;
    },
  });

  const { mutateAsync: updateTransaction, isPending: isUpdating } = useMutation({
    ...mutationOptions,
    mutationFn: async ({ id, formData }: { id: string, formData: Partial<TransactionFormData> }) => {
      const response = await transactionService.updateTransaction(id, formData);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update transaction');
      }
      return response.data;
    },
  });

  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useMutation({
    ...mutationOptions,
    mutationFn: async (id: string) => {
      const response = await transactionService.deleteTransaction(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete transaction');
      }
    },
  });

  return {
    transactions: transactions ?? [],
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
    filters: { searchTerm, dateFilter, typeFilter },
    setSearchTerm,
    setDateFilter,
    setTypeFilter,
    createTransaction,
    isCreating,
    updateTransaction,
    isUpdating,
    deleteTransaction,
    isDeleting,
  };
};
