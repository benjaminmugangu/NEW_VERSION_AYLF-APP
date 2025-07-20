// src/app/dashboard/finances/small-group/[smallGroupId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users, Receipt, Wallet, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import { smallGroupService } from '@/services/smallGroupService';
import type { SmallGroup } from '@/lib/types';
import { StatCard } from "@/components/shared/StatCard";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { useEntityFinancials } from "@/hooks/useEntityFinancials";
import { FinancialPageSkeleton } from "@/components/shared/FinancialPageSkeleton";
import { AllocationList } from '@/app/dashboard/finances/components/AllocationList';
import { ReportList } from '@/app/dashboard/finances/components/ReportList';

export default function SmallGroupFinancialDashboardPage() {
  const params = useParams();
  const smallGroupId = params.smallGroupId as string;
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const [smallGroup, setSmallGroup] = useState<SmallGroup | null>(null);
  const [isSmallGroupLoading, setIsSmallGroupLoading] = useState(true);

  const financialOptions = useMemo(() => ({
    dateFilter,
    entity: { type: 'smallGroup' as const, id: smallGroupId }
  }), [dateFilter, smallGroupId]);

  const { stats, isLoading: areFinancialsLoading } = useEntityFinancials(financialOptions);

  useEffect(() => {
    const fetchSmallGroup = async () => {
      if (!smallGroupId) return;
      setIsSmallGroupLoading(true);
      const response = await smallGroupService.getSmallGroupById(smallGroupId);
      if (response.success && response.data) {
        setSmallGroup(response.data);
      } else {
        setSmallGroup(null);
      }
      setIsSmallGroupLoading(false);
    };
    fetchSmallGroup();
  }, [smallGroupId]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (areFinancialsLoading || isSmallGroupLoading) {
      return <FinancialPageSkeleton statCardCount={3} />;
  }

  if (!smallGroup) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <div className="p-4 md:p-8 pt-6">
            <PageHeader title="Small Group Not Found" icon={Users} />
            <p className="mt-4">The requested small group could not be found.</p>
        </div>
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader
            title={`Financial Overview for ${smallGroup.name}`}
            description={`An overview of the finances for ${smallGroup.name}.`}
            icon={Users}
        />

        <div className="my-4">
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey}/>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard 
                title="Funds Received"
                value={formatCurrency(stats?.totalRevenue || 0)}
                icon={Receipt}
                description="Total funds allocated to this group"
            />
            <StatCard 
                title="Expenses Declared"
                value={formatCurrency(stats?.totalExpenses || 0)}
                icon={TrendingDown}
                description="Total expenses from activity reports"
            />
            <StatCard 
                title="Current Balance"
                value={formatCurrency(stats?.netBalance || 0)}
                icon={Wallet}
                description="Remaining funds for this group"
            />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <AllocationList 
                allocations={stats?.allocations || []}
                title="Funds Received History"
                emptyStateMessage="This small group has not received any funds in the selected period."
            />
            <ReportList
                reports={stats?.reports || []}
                title="Declared Expenses History"
                emptyStateMessage="No expenses have been declared for this group in the selected period."
            />
        </div>
      </div>
    </RoleBasedGuard>
  );
}