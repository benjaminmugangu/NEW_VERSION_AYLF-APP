'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Banknote, Building, Receipt, TrendingDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import { siteService } from '@/services/siteService';
import type { Site } from '@/lib/types';
import { StatCard } from "@/components/shared/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { useEntityFinancials } from "@/hooks/useEntityFinancials";
import { FinancialPageSkeleton } from "@/components/shared/FinancialPageSkeleton";
import { AllocationList } from '@/app/dashboard/finances/components/AllocationList';
import { ReportList } from '@/app/dashboard/finances/components/ReportList';

export default function SiteFinancialDashboardPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });
  const [site, setSite] = useState<Site | null>(null);
  const [isSiteLoading, setIsSiteLoading] = useState(true);

  const financialOptions = useMemo(() => ({
    dateFilter,
    entity: { type: 'site' as const, id: siteId }
  }), [dateFilter, siteId]);

  const { stats, isLoading: areFinancialsLoading } = useEntityFinancials(financialOptions);

  useEffect(() => {
    const fetchSite = async () => {
      if (!siteId) return;
      setIsSiteLoading(true);
      const response = await siteService.getSiteById(siteId);
      if (response.success && response.data) {
        setSite(response.data);
      } else {
        setSite(null);
      }
      setIsSiteLoading(false);
    };
    fetchSite();
  }, [siteId]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  if (areFinancialsLoading || isSiteLoading) {
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
      <PageHeader 
        title={`${site?.name || 'Site'} Finances`}
        description={`An overview of the finances for ${site?.name || 'this site'}.`}
      />
      <div className="p-4">
        <div className="mb-4">
          <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Banknote} title="Total Revenue" value={formatCurrency(stats?.totalRevenue || 0)} />
          <StatCard icon={TrendingDown} title="Total Allocated" value={formatCurrency(stats?.totalAllocated || 0)} />
          <StatCard icon={Receipt} title="Total Expenses" value={formatCurrency(stats?.totalExpenses || 0)} />
          <StatCard icon={Building} title="Net Balance" value={formatCurrency(stats?.netBalance || 0)} />
        </div>
        <div className="mt-8">
          <Tabs defaultValue="allocations">
            <TabsList>
              <TabsTrigger value="allocations">Allocations</TabsTrigger>
              <TabsTrigger value="reports">Financial Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="allocations">
              <AllocationList 
                allocations={stats?.allocations || []} 
                title="Allocations" 
                emptyStateMessage="No allocations found for the selected period." 
              />
            </TabsContent>
            <TabsContent value="reports">
              <ReportList reports={stats?.reports || []} title="Financial Reports" emptyStateMessage="No reports found for the selected period." />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RoleBasedGuard>
  );
}