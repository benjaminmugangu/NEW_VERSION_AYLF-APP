// src/app/dashboard/finances/small-group/[smallGroupId]/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockSmallGroups } from "@/lib/mockData";
import { AllocationList } from "@/app/dashboard/finances/components/AllocationList";
import { ReportList } from "@/app/dashboard/finances/components/ReportList";
import { Users, Receipt, Wallet, TrendingDown } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { useFinancials } from "@/hooks/useFinancials";
import { FinancialPageSkeleton } from "@/components/shared/FinancialPageSkeleton";

export default function SmallGroupFinancialDashboardPage() {
  const params = useParams();
  const smallGroupId = params.smallGroupId as string;
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const financialOptions = useMemo(() => ({
    dateFilter,
    entity: { type: 'smallGroup' as const, id: smallGroupId }
  }), [dateFilter, smallGroupId]);
  const { stats, isLoading } = useFinancials(financialOptions);
  
  const smallGroup = useMemo(() => mockSmallGroups.find(sg => sg.id === smallGroupId), [smallGroupId]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (isLoading) {
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
            description={`Current balance for period: ${formatCurrency(stats.balance)}. Filter: ${dateFilter.display}`}
            icon={Users}
        />

        <div className="my-4">
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey}/>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard 
                title="Funds Received"
                value={formatCurrency(stats.fundsReceived)}
                icon={Receipt}
                description="Total funds allocated to this group"
            />
            <StatCard 
                title="Expenses Declared"
                value={formatCurrency(stats.expensesDeclared)}
                icon={TrendingDown}
                description="Total expenses from activity reports"
            />
            <StatCard 
                title="Current Balance"
                value={formatCurrency(stats.balance)}
                icon={Wallet}
                description="Remaining funds for this group"
            />
        </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <AllocationList 
                allocations={stats.allocationsReceived}
                title="Funds Received History"
                emptyStateMessage="This small group has not received any funds in the selected period."
            />
            <ReportList
                reports={stats.relevantReports}
                title="Declared Expenses History"
                emptyStateMessage="No expenses have been declared for this group in the selected period."
            />
        </div>
      </div>
    </RoleBasedGuard>
  );
}