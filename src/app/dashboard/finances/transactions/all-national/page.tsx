// src/app/dashboard/finances/transactions/all-national/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockTransactions } from "@/lib/mockData";
import { TransactionTable } from "@/components/shared/TransactionTable";
import { ListChecks } from "lucide-react"; 
import { Card, CardContent } from "@/components/ui/card";
import { DateRangeFilter, applyDateFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";

export default function AllNationalTransactionsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const nationalTransactions = useMemo(() => {
    return mockTransactions.filter(
      t => t.level === 'national' 
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const filteredTransactions = useMemo(() => {
    return applyDateFilter(nationalTransactions, dateFilter);
  }, [nationalTransactions, dateFilter]);

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title="All National Level Transactions"
        description={`A comprehensive list of all financial activities for AYLF National Coordination. Filter: ${dateFilter.display}`}
        icon={ListChecks}
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
