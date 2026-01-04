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
import { StatCard } from "@/components/shared/StatCard";
import { Banknote, TrendingUp, TrendingDown, DollarSign, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from 'next-intl';
import { ROLES } from '@/lib/constants';
import Link from 'next/link';

export default function FinancesPage() {
  const t = useTranslations('Finances');
  const tCommon = useTranslations('Common');
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

  const canSendFunds = currentUser?.role === ROLES.NATIONAL_COORDINATOR || currentUser?.role === ROLES.SITE_COORDINATOR;

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
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('dashboard_title')}</h2>
          <p className="text-muted-foreground">{t('dashboard_desc') ?? 'Manage and track your financial activities.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSendFunds && (
            <Button asChild variant="default" size="sm" className="bg-primary hover:bg-primary/90">
              <Link href="/dashboard/finances/allocations/new" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {t('send_funds_btn') ?? 'Envoyer Fonds'}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/finances/transactions/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('new_transaction_btn') ?? 'Nouvelle Transaction'}
            </Link>
          </Button>
          <DateRangeFilter
            onFilterChange={setDateFilter}
            initialRangeKey={dateFilter.rangeKey}
          />
        </div>
      </div>

      {/* Full Width Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('current_balance')}
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.netBalance)}
          icon={Banknote}
          description={t('desc_balance')}
        />
        <StatCard
          title={t('funds_received')}
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.income)}
          icon={TrendingUp}
          description={t('desc_received')}
          trend="up"
        />
        <StatCard
          title={t('reported_expenses')}
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalSpent)}
          icon={TrendingDown}
          description={t('desc_expenses')}
          trend="down"
        />
        <StatCard
          title={t('reallocated_funds')}
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalAllocated)}
          icon={DollarSign}
          description={t('desc_reallocated')}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <FinancialDashboard
            stats={stats}
            currentUser={currentUser}
            linkGenerator={(type, id) => `/dashboard/finances/${type}/${id}`}
            hideStats={true} // New prop to hide internal stats
          />
        </div>
        <div>
          <RecentTransactions transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
