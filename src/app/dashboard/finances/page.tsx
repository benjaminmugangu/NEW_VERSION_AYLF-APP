"use client";

import React, { useState, useMemo } from 'react';
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { useFinancials } from "@/hooks/useFinancials";
import FinancialDashboard from "./components/FinancialDashboard";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
      <div className="col-span-4">
        <Skeleton className="h-[350px]" />
      </div>
      <div className="col-span-3">
        <Skeleton className="h-[350px]" />
      </div>
    </div>
  </div>
);

export default function FinancesPage() {
  const { stats, isLoading, error, refetch, dateFilter, setDateFilter, currentUser } = useFinancials();

  if (isLoading) {
    return <FinancesPageSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h2 className="text-xl font-semibold text-destructive mb-2">Erreur de chargement des données</h2>
        <p className="text-muted-foreground mb-4">
          {error || "Nous n'avons pas pu récupérer les statistiques financières."}
        </p>
        <Button onClick={refetch}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Finances Dashboard</h2>
        <div className="flex items-center space-x-2">
          {/* TODO: Add NewAllocationModal when ready */}
          <DateRangeFilter 
            onFilterChange={setDateFilter} 
            initialRangeKey={dateFilter.rangeKey} 
          />
        </div>
      </div>
      <FinancialDashboard 
        stats={stats} 
        currentUser={currentUser}
        linkGenerator={(type, id) => `/dashboard/finances/${type}/${id}`}
      />
    </div>
  );
}