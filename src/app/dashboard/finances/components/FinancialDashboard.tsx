// src/app/dashboard/finances/components/FinancialDashboard.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp, Banknote } from "lucide-react";
import { FinancialStats } from '@/hooks/useFinancials';
import { User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

interface FinancialDashboardProps {
  stats: FinancialStats;
  currentUser: User | null;
}

const StatCard = ({ title, value, icon: Icon, description, currency = 'USD' }: { title: string; value: number; icon: React.ElementType; description: string; currency?: string; }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ stats, currentUser }) => {
  if (!currentUser) return null;

  const { fundsReceived, expensesDeclared, fundsReallocated, balance } = stats;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Solde Actuel" 
          value={balance} 
          icon={Banknote} 
          description="Fonds reçus - (Dépenses + Réallocations)"
        />
        <StatCard 
          title="Fonds Reçus" 
          value={fundsReceived} 
          icon={TrendingUp} 
          description="Total des fonds alloués à cette entité"
        />
        <StatCard 
          title="Dépenses Déclarées" 
          value={expensesDeclared} 
          icon={TrendingDown} 
          description="Total des dépenses enregistrées"
        />
        <StatCard 
          title="Fonds Réalloués" 
          value={fundsReallocated} 
          icon={DollarSign} 
          description="Total des fonds transférés à d'autres entités"
        />
      </div>
      {/* TODO: Add transactions and reports display logic here */}
    </div>
  );
};

export default FinancialDashboard;
