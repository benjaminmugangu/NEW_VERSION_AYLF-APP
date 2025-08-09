'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService, type TransactionFilters } from '@/services/transactionService';
import { useAuth } from '@/contexts/AuthContext';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';
import type { TransactionFormData } from '@/lib/types';

const defaultDateFilter: DateFilterValue = { rangeKey: 'all_time', display: 'All Time' };

export const useTransactions = (initialFilters: Partial<TransactionFilters> = {}) => {
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();

  // Filter states
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialFilters.dateFilter || defaultDateFilter);
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | 'all'>(initialFilters.typeFilter || 'all');

  const filters: TransactionFilters = { user, searchTerm, dateFilter, typeFilter, entity: initialFilters.entity };

  const { 
    data: transactions,
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      const response = await transactionService.getFilteredTransactions(filters);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch transactions');
    },
    enabled: !!user,
  });

  const mutationOptions = {
    onSuccess: () => {
      // Invalidate the specific query for the transaction list
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id, filters] });
      // Invalidate financials which likely depend on the user
      queryClient.invalidateQueries({ queryKey: ['financials', user?.id] }); 
    },
  };

  const { mutateAsync: createTransaction, isPending: isCreating } = useMutation({
    ...mutationOptions,
    mutationFn: (formData: TransactionFormData) => transactionService.createTransaction(formData),
  });

  const { mutateAsync: updateTransaction, isPending: isUpdating } = useMutation({
    ...mutationOptions,
    mutationFn: ({ id, formData }: { id: string, formData: Partial<TransactionFormData> }) => 
      transactionService.updateTransaction(id, formData),
  });

  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useMutation({
    ...mutationOptions,
    mutationFn: (id: string) => transactionService.deleteTransaction(id),
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
