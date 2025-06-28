// src/app/dashboard/finances/transactions/national-expenses/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockTransactions } from "@/lib/mockData";
import { TransactionTable } from "@/components/shared/TransactionTable";
import { TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangeFilter, applyDateFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";

export default function NationalExpensesTransactionsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const allNationalExpenseTransactions = useMemo(() => {
     return mockTransactions.filter(
      t => t.senderEntityType === 'national' && t.transactionType === 'expense'
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const filteredTransactions = useMemo(() => {
    return applyDateFilter(allNationalExpenseTransactions, dateFilter);
  }, [allNationalExpenseTransactions, dateFilter]);
  
  const totalNationalExpenses = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title="National Expense Transactions"
        description={`Review all expenses by AYLF National Coordination. Total for period: $${totalNationalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}. Filter: ${dateFilter.display}`}
        icon={TrendingDown}
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
