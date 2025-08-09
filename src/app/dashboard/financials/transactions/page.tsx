'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTransactions } from '@/hooks/useTransactions'; // Assuming this hook exists or will be created
import { columns } from '@/components/financials/transactions/columns'; // Assuming this will be created
import { DataTable } from '../../../../components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

const TransactionsListPage = () => {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  const { transactions, isLoading, error } = useTransactions({
    typeFilter: type === 'income' ? 'income' : type === 'expense' ? 'expense' : undefined,
  });

  const pageTitle = type === 'income' ? 'Income Transactions' : type === 'expense' ? 'Expense Transactions' : 'All Transactions';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <Button asChild>
          <Link href="/dashboard/financials/transactions/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
          </Link>
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={transactions || []}
        isLoading={isLoading}
        error={error}
        filterColumnId="description"
        filterPlaceholder="Filter by description..."
      />
    </div>
  );
};

export default TransactionsListPage;
