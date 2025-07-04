"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockSites } from "@/lib/mockData";
import { AllocationList } from "@/app/dashboard/finances/components/AllocationList";
import { ReportList } from "@/app/dashboard/finances/components/ReportList";
import { Building, Users, Receipt, Banknote, TrendingDown } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { useFinancials } from "@/hooks/useFinancials";
import { FinancialPageSkeleton } from "@/components/shared/FinancialPageSkeleton";

export default function SiteFinancialDashboardPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const financialOptions = useMemo(() => ({
    dateFilter,
    entity: { type: 'site' as const, id: siteId }
  }), [dateFilter, siteId]);
  const { stats, isLoading } = useFinancials(financialOptions);
  
  const site = useMemo(() => mockSites.find(s => s.id === siteId), [siteId]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (isLoading) {
      return <FinancialPageSkeleton statCardCount={4} />;
  }

  if (!site) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <div className="p-4 md:p-8 pt-6">
            <PageHeader title="Site Not Found" icon={Building} />
            <p className="mt-4">The requested site could not be found.</p>
        </div>
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader
            title={`Financial Overview for ${site.name}`}
            description={`Manage finances for ${site.name}. Filter: ${dateFilter.display}`}
            icon={Building}
        />

        <div className="my-4">
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey}/>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             <StatCard 
                title="Total Funds Received"
                value={formatCurrency(stats.fundsReceived)}
                icon={Receipt}
             />
             <StatCard 
                title="Transferred to Groups"
                value={formatCurrency(stats.fundsReallocated)}
                icon={Users}
             />
             <StatCard 
                title="Dépenses Déclarées"
                value={formatCurrency(stats.expensesDeclared)}
                icon={TrendingDown}
             />
             <StatCard 
                title="Available Balance"
                value={formatCurrency(stats.balance)}
                icon={Building}
             />
        </div>
        
        <Tabs defaultValue="transfers_to_sg" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="funds_received"><Receipt className="mr-2 h-4 w-4" />Funds Received</TabsTrigger>
                <TabsTrigger value="transfers_to_sg"><Users className="mr-2 h-4 w-4" />Transfers to Groups</TabsTrigger>
                <TabsTrigger value="site_expenses"><Banknote className="mr-2 h-4 w-4" />Site Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value="funds_received">
                <AllocationList 
                    allocations={stats.allocationsReceived}
                    title={`Funds Received by ${site.name}`}
                    emptyStateMessage="This site has not received any funds in the selected period."
                />
            </TabsContent>

            <TabsContent value="transfers_to_sg">
                <AllocationList 
                    allocations={stats.allocationsSent}
                    title="Transfers to Small Groups"
                    emptyStateMessage="This site has not transferred any funds in the selected period."
                    linkGenerator={(type, id) => `/dashboard/finances/small-group/${id}`}
                />
            </TabsContent>

                        <TabsContent value="site_expenses">
                <ReportList 
                    reports={stats.relevantReports}
                    title={`Dépenses déclarées pour ${site.name}`}
                    emptyStateMessage="Aucune dépense n'a été déclarée pour ce site dans la période sélectionnée."
                />
            </TabsContent>
        </Tabs>
      </div>
    </RoleBasedGuard>
  );
}