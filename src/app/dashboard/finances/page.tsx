"use client";

import React from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useFinancials } from '@/hooks/useFinancials';
import { useTransactions } from '@/hooks/useTransactions';
import FinancialDashboard from "./components/FinancialDashboard";
import { RecentTransactions } from './components/RecentTransactions';
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants";

const FinancesPageSkeleton = () => (
  <div className="space-y-4 p-4 md:p-8 pt-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
      <Skeleton className="h-[126px]" />
    </div>
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mt-4">
      <div className="lg:col-span-2">
        <Skeleton className="h-[450px]" />
      </div>
      <div>
        <Skeleton className="h-[450px]" />
      </div>
    </div>
  </div>
);

export default function FinancesPage() {
    const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ rangeKey: 'this_year', display: 'This Year' });
  const currentUser = useCurrentUser();

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

  if (isLoadingFinancials || isLoadingTransactions) {
    return <FinancesPageSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-xl font-semibold text-destructive mb-2">Erreur de chargement des données</h2>
        <p className="text-muted-foreground mb-4">
          {error || "Nous n'avons pas pu récupérer les statistiques financières."}
        </p>
        <Button onClick={() => refetch()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Finances Dashboard</h2>
        <div className="flex items-center space-x-2">
          <DateRangeFilter 
            onFilterChange={setDateFilter} 
            initialRangeKey={dateFilter.rangeKey} 
          />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FinancialDashboard 
            stats={stats} 
            currentUser={currentUser}
            linkGenerator={(type, id) => `/dashboard/finances/${type}/${id}`}
          />
        </div>
        <div>
          <RecentTransactions transactions={transactions} />
        </div>
      </div>
    </div>
  );
}