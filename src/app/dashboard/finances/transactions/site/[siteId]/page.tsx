// src/app/dashboard/finances/transactions/site/[siteId]/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockTransactions, mockSites, mockSmallGroups } from "@/lib/mockData";
import { TransactionTable } from "@/components/shared/TransactionTable";
import { Building, Users, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "next/navigation";
import { DateRangeFilter, applyDateFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";

export default function SiteTransactionsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const site = mockSites.find(s => s.id === siteId);

  const allSiteTransactions = useMemo(() => {
    // Fetch all transactions related to this site once
    return mockTransactions.filter(t => t.relatedSiteId === siteId || (t.senderEntityId === siteId && t.senderEntityType === 'site') || (t.recipientEntityId === siteId && t.recipientEntityType === 'site'));
  }, [siteId]);


  const filteredSiteTransactions = useMemo(() => {
    return applyDateFilter(allSiteTransactions, dateFilter);
  }, [allSiteTransactions, dateFilter]);


  const siteTransfersToSmallGroups = useMemo(() => {
    return filteredSiteTransactions.filter(
      t => t.senderEntityType === 'site' && t.senderEntityId === siteId && t.recipientEntityType === 'small_group'
    ).map(t => {
      const sg = mockSmallGroups.find(s => s.id === t.recipientEntityId);
      return {...t, recipientEntityName: sg ? sg.name : (t.recipientEntityName || t.recipientEntityId) }
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSiteTransactions, siteId]);

  const siteExpenses = useMemo(() => {
    return filteredSiteTransactions.filter(
      t => t.senderEntityType === 'site' && t.senderEntityId === siteId && t.transactionType === 'expense'
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSiteTransactions, siteId]);

  const fundsReceivedBySite = useMemo(() => {
    return filteredSiteTransactions.filter(
      t => t.recipientEntityType === 'site' && t.recipientEntityId === siteId && t.transactionType === 'transfer'
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredSiteTransactions, siteId]);
  
  const totalFundsReceived = fundsReceivedBySite.reduce((sum, t) => sum + t.amount, 0);
  const totalTransferredToSGs = siteTransfersToSmallGroups.reduce((sum, t) => sum + t.amount, 0);
  const totalSiteExpenses = siteExpenses.reduce((sum, t) => sum + t.amount, 0);
  const siteNetBalance = totalFundsReceived - (totalTransferredToSGs + totalSiteExpenses);


  if (!site) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <PageHeader title="Site Not Found" icon={Building} />
        <p>The requested site could not be found.</p>
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <PageHeader
        title={`Financial Transactions for ${site.name}`}
        description={`Overview of funds received, transfers, and expenses for period: ${dateFilter.display}. Current Balance (Illustrative): $${siteNetBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
        icon={Building}
      />

      <div className="mb-4">
          <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey}/>
      </div>
      
      <Tabs defaultValue="transfers_to_sg" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="funds_received">
            <Receipt className="mr-2 h-4 w-4" />Funds Received by Site
          </TabsTrigger>
          <TabsTrigger value="transfers_to_sg">
            <Users className="mr-2 h-4 w-4" />Transfers to Small Groups
          </TabsTrigger>
          <TabsTrigger value="site_expenses">
            <Building className="mr-2 h-4 w-4" />Site Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funds_received">
          <Card>
            <CardHeader>
                <CardTitle>Funds Received by {site.name}</CardTitle>
                <CardDescription>Funds transferred from AYLF National to this site. Total for period: ${totalFundsReceived.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionTable transactions={fundsReceivedBySite} siteContextId={siteId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers_to_sg">
          <Card>
             <CardHeader>
                <CardTitle>Transfers from {site.name} to Small Groups</CardTitle>
                <CardDescription>Funds distributed by this site to its small groups. Total for period: ${totalTransferredToSGs.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionTable transactions={siteTransfersToSmallGroups} siteContextId={siteId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site_expenses">
          <Card>
            <CardHeader>
                <CardTitle>Expenses for {site.name}</CardTitle>
                <CardDescription>Direct expenses incurred by this site. Total for period: ${totalSiteExpenses.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionTable transactions={siteExpenses} siteContextId={siteId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </RoleBasedGuard>
  );
}
