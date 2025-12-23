// src/app/dashboard/financials/page.tsx
'use client';

import React, { useState } from 'react';
import { useFinancials } from "@/hooks/useFinancials";
import { useAuth } from '@/contexts/AuthContext';
import { Landmark, TrendingUp, TrendingDown, ArrowRightLeft, DollarSign, PlusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StatCard, StatCardProps } from "@/components/shared/StatCard";
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardSkeleton } from '@/components/shared/skeletons/DashboardSkeleton';
import * as transactionService from '@/services/transactionService';
import { useToast } from '@/hooks/use-toast';
import { ROLES } from '@/lib/constants';
import { RecentTransactionsTable } from '@/components/financials/RecentTransactionsTable';

const FinancialsPage = () => {
  const { currentUser } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: 'All Time' });
  const { stats: financials, isLoading, error } = useFinancials(currentUser, dateFilter);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!financials) return <div>No financial data available.</div>;

  const actualBalance = financials.income - (financials.expenses + financials.totalAllocated);

  const incomeVsExpenseData = [
    { name: 'Financials', income: financials.income, expenses: financials.expenses },
  ];

  const getAllocationButtonText = () => {
    if (currentUser?.role === ROLES.NATIONAL_COORDINATOR) return 'Send Funds to Site';
    if (currentUser?.role === ROLES.SITE_COORDINATOR) return 'Send Funds to Small Group';
    return 'Add Allocation';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financials Dashboard"
        description="An overview of your entity's financial health."
        actions={<DateRangeFilter onFilterChange={setDateFilter} />}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Solde Actuel" value={formatCurrency(actualBalance)} icon={Landmark} />
        <StatCard title="Fonds Reçus" value={formatCurrency(financials.income)} icon={TrendingUp} href="/dashboard/financials/transactions?type=income" />
        <StatCard title="Dépenses via Rapports" value={formatCurrency(financials.totalSpent)} icon={TrendingDown} href="/dashboard/financials/reports" />
        <StatCard title="Fonds Réalloués" value={formatCurrency(financials.totalAllocated)} icon={ArrowRightLeft} href="/dashboard/financials/allocations" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs. Expenses</CardTitle>
            <CardDescription>A summary of total income and direct expenses for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="income" fill="hsl(var(--chart-2))" name="Income" />
                <Bar dataKey="expenses" fill="hsl(var(--chart-5))" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Button asChild>
              <Link href="/dashboard/financials/transactions/new">Add Income/Expense</Link>
            </Button>
            {currentUser?.role !== ROLES.MEMBER && (
              <Button asChild variant="secondary">
                <Link href="/dashboard/financials/allocations/new">
                  {getAllocationButtonText()}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            {financials.allocations.length > 0 ? (
              <ul className="space-y-3">
                {financials.allocations.slice(0, 5).map(alloc => (
                  <li key={alloc.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                    <div>
                      <p className="font-medium">{alloc.siteName || alloc.smallGroupName}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(alloc.allocationDate)}</p>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(alloc.amount)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent allocations.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports with Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {financials.reports.some(r => (r.totalExpenses || 0) > 0) ? (
              <ul className="space-y-3">
                {financials.reports.filter(r => (r.totalExpenses || 0) > 0).slice(0, 5).map(report => (
                  <li key={report.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                    <div>
                      <p className="font-medium truncate max-w-xs">{report.title}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(report.activityDate)}</p>
                    </div>
                    <p className="font-bold text-lg text-red-500">{formatCurrency(report.totalExpenses || 0)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent reports with expenses.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialsPage;
