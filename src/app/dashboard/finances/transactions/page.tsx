'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionTable } from './components/TransactionTable';
import { columns } from './components/columns';
import { Button } from '@/components/ui/button';
import { DateRangeFilter, DateFilterValue } from '@/components/shared/DateRangeFilter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle } from 'lucide-react';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { FinancialTransaction, TransactionFormData } from '@/lib/types';

export default function TransactionsPage() {
  const { currentUser } = useAuth();
  const {
    transactions,
    isLoading,
    error,
    filters,
    setSearchTerm,
    setDateFilter,
    setTypeFilter,
    deleteTransaction,
    isDeleting
  } = useTransactions({ user: currentUser });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);

  const handleEdit = (transaction: FinancialTransaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        alert('Transaction deleted successfully');
      } catch (e) {
        const error = e as Error;
        alert(`Failed to delete transaction: ${error.message}`);
      }
    }
  };

  const memoizedColumns = useMemo(() => columns.map(col => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: ({ row }: { row: { original: FinancialTransaction } }) => (
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>Edit</Button>
        )
      };
    }
    return col;
  }), [handleEdit, handleDelete]);

  if (isLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (error) {
    return <div className="text-destructive">Error: {error.message}</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => {
            setSelectedTransaction(null);
            setIsModalOpen(true);
          }}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={filters.dateFilter.rangeKey} />
            <Select onValueChange={(value) => setTypeFilter(value as 'income' | 'expense' | 'all')} defaultValue={filters.typeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TransactionTable
            columns={memoizedColumns}
            data={transactions}
            searchTerm={filters.searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </CardContent>
      </Card>

      <TransactionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
}
