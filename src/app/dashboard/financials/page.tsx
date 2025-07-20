// src/app/dashboard/financials/page.tsx
'use client';

import React from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { RecentTransactionsTable } from '@/components/financials/RecentTransactionsTable';

const FinancialsPage = () => {
  const { stats: financials, isLoading, error } = useFinancials();

  if (isLoading) {
    return <div>Loading financial data...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!financials) {
    return <div>No financial data available.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Financials Dashboard</h1>
        <div className="flex space-x-2">
          <Link href="/dashboard/financials/transactions/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </Link>
          <Link href="/dashboard/financials/allocations/new">
            <Button variant="secondary">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Allocation
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(financials.totalRevenue)} />
        <StatCard title="Total Expenses" value={formatCurrency(financials.totalExpenses)} />
        <StatCard title="Total Allocated" value={formatCurrency(financials.totalAllocated)} />
        <StatCard title="Net Balance" value={formatCurrency(financials.netBalance)} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <RecentTransactionsTable transactions={financials.transactions} />
      </div>
    </div>
  );
};

export default FinancialsPage;
