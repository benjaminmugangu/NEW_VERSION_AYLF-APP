"use client";

// Force dynamic rendering since this uses client hooks
export const dynamic = 'force-dynamic';

import React from 'react';
import { useCurrentUser } from '@/contexts/AuthContext';
import { useFinancials } from '@/hooks/useFinancials';
import { useTransactions } from '@/hooks/useTransactions';
import FinancialDashboard from "./components/FinancialDashboard";
import { RecentTransactions } from './components/RecentTransactions';
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { PageSkeleton } from "@/components/ui-custom/PageSkeleton";
import { Button } from "@/components/ui/button";
import { useTranslations } from 'next-intl';

export default function FinancesPage() {
  const t = useTranslations('Finances');
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ rangeKey: 'this_year', display: 'This Year' });
  const { currentUser, isLoading: isLoadingUser } = useCurrentUser();

  const {
    stats,
    isLoading: isLoadingFinancials,
    error,
    refetch
  } = useFinancials(currentUser, dateFilter);

  const {
    transactions,
    isLoading: isLoadingTransactions
  } = useTransactions({ user: currentUser });

  if (isLoadingUser || isLoadingFinancials || isLoadingTransactions) {
    return <PageSkeleton type="card" />;
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-xl font-semibold text-destructive mb-2">{t('error_load')}</h2>
        <p className="text-muted-foreground mb-4">
          {error || t('error_desc')}
        </p>
        <Button onClick={() => refetch()}>{t('retry')}</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('dashboard_title')}</h2>
        <div className="flex items-center space-x-2">
          <DateRangeFilter
            onFilterChange={setDateFilter}
            initialRangeKey={dateFilter.rangeKey}
          />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FinancialDashboard
            stats={stats}
            currentUser={currentUser}
            linkGenerator={(type, id) => `/dashboard/finances/${type}/${id}`}
          />
        </div>
        <div>
          <RecentTransactions transactions={transactions} />
        </div>
      </div>
    </div>
  );
}