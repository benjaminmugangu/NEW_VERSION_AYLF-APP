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

  const filters: TransactionFilters = { user: user!, searchTerm, dateFilter, typeFilter: typeFilter === 'all' ? undefined : typeFilter, entity: initialFilters.entity };

  const {
    data: transactions,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: () => transactionService.getFilteredTransactions(filters),
    initialData: initialData,
    enabled: !!user,
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
    mutationFn: (formData: TransactionFormData) => {
      const idempotencyKey = crypto.randomUUID();
      return transactionService.createTransaction(formData, idempotencyKey);
    },
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
