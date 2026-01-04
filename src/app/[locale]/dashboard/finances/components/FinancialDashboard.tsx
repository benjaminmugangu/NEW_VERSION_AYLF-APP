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
  hideStats?: boolean;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ stats, currentUser, linkGenerator, hideStats = false }) => {
  const t = useTranslations('Finances');

  if (!currentUser) return null;

  const { income, totalSpent, totalAllocated, netBalance, allocations, reports } = stats;

  const allRelevantAllocations = [...allocations].sort(
    (a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
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
