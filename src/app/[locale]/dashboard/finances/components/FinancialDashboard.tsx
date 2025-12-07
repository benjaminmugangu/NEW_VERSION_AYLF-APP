"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Banknote } from "lucide-react";
import type { Financials, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { AllocationList } from './AllocationList';
import { ReportList } from './ReportList'; // Import the new component
import { useTranslations, useFormatter } from 'next-intl';

interface FinancialDashboardProps {
  stats: Financials;
  currentUser: User | null;
  linkGenerator?: (type: 'site' | 'smallGroup', id: string) => string;
}

const StatCard = ({ title, value, icon: Icon, description, currency = 'USD' }: { title: string; value: number; icon: React.ElementType; description: string; currency?: string; }) => {
  const format = useFormatter();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{format.number(value, { style: 'currency', currency })}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ stats, currentUser, linkGenerator }) => {
  const t = useTranslations('Finances');

  if (!currentUser) return null;

  const { income, totalSpent, totalAllocated, netBalance, allocations, reports } = stats;

  const allRelevantAllocations = [...allocations].sort(
    (a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('current_balance')}
          value={netBalance}
          icon={Banknote}
          description={t('desc_balance')}
        />
        <StatCard
          title={t('funds_received')}
          value={income}
          icon={TrendingUp}
          description={t('desc_received')}
        />
        <StatCard
          title={t('reported_expenses')}
          value={totalSpent}
          icon={TrendingDown}
          description={t('desc_expenses')}
        />
        <StatCard
          title={t('reallocated_funds')}
          value={totalAllocated}
          icon={DollarSign}
          description={t('desc_reallocated')}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <AllocationList
          allocations={allRelevantAllocations}
          title={t('recent_allocations')}
          emptyStateMessage={t('no_allocations')}
          linkGenerator={linkGenerator}
        />
        <ReportList
          reports={reports}
        />
      </div>
    </div>
  );
};

export default FinancialDashboard;
