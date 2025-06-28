// src/app/dashboard/finances/transactions/transfers-to-sites/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockTransactions, mockSites } from "@/lib/mockData";
import { TransactionTable } from "@/components/shared/TransactionTable";
import { Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, applyDateFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";

export default function TransfersToSitesPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const allTransfersToSites = useMemo(() => {
    return mockTransactions.filter(
      t => t.senderEntityType === 'national' && t.recipientEntityType === 'site'
    ).map(t => {
        const site = mockSites.find(s => s.id === t.recipientEntityId);
        return {
          ...t,
          recipientEntityName: site ? site.name : t.recipientEntityName || t.recipientEntityId,
        };
      }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);
  
  const filteredTransactions = useMemo(() => {
    return applyDateFilter(allTransfersToSites, dateFilter);
  }, [allTransfersToSites, dateFilter]);

  const totalTransferred = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title="Funds Distributed to Sites"
        description={`Review fund transfers from National Coordination to sites. Total for period: $${totalTransferred.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}. Filter: ${dateFilter.display}`}
        icon={Send}
      />
      <div className="mb-4">
        <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <TransactionTable
            transactions={filteredTransactions}
          />
        </CardContent>
      </Card>
    </RoleBasedGuard>
  );
}
