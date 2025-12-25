"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from "@/components/shared/PageHeader";
import { AllocationForm } from '@/app/[locale]/dashboard/finances/components/AllocationForm';
import { DirectAllocationCheckbox } from '@/components/DirectAllocationCheckbox';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';
import type { FundAllocationFormData, Site, SmallGroup } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import * as allocationService from '@/services/allocations.service';
import * as siteService from '@/services/siteService';
import * as smallGroupService from '@/services/smallGroupService';

export default function NewAllocationPage() {
  const { currentUser: user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [recipients, setRecipients] = useState<Array<{ id: string, name: string }>>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // NEW: Hybrid allocation state for NC
  const [isDirect, setIsDirect] = useState(false);
  const [bypassReason, setBypassReason] = useState('');

  const isNC = user?.role === ROLES.NATIONAL_COORDINATOR;
  const isSC = user?.role === ROLES.SITE_COORDINATOR;

  // Determine recipient type based on role and mode
  const recipientType = isNC ? (isDirect ? 'smallGroup' : 'site') : 'smallGroup';

  useEffect(() => {
    const fetchRecipients = async () => {
      if (!user) return;
      setIsDataLoading(true);
      try {
        if (isNC) {
          if (isDirect) {
            // NC direct mode: load ALL small groups
            const sites = await siteService.getSitesWithDetails(user);
            const allGroups: Array<{ id: string, name: string }> = [];
            for (const site of sites) {
              const groups = await smallGroupService.getFilteredSmallGroups({ user, siteId: site.id });
              allGroups.push(...groups.map(g => ({ ...g, name: `${g.name} (${site.name})` })));
            }
            setRecipients(allGroups);
          } else {
            // NC hierarchical mode: load sites
            const sites = await siteService.getSitesWithDetails(user);
            setRecipients(sites);
          }
        } else if (isSC && user.siteId) {
          // SC: always load small groups from their site
          const smallGroups = await smallGroupService.getFilteredSmallGroups({ user, siteId: user.siteId });
          setRecipients(smallGroups);
        }
      } catch (error) {
        toast({ title: "Error", description: "Could not load recipient data.", variant: 'destructive' });
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchRecipients();
  }, [user, isDirect, toast, isNC, isSC]);

  const handleCreateAllocation = async (data: any) => {
    if (!user) return;

    // Validate bypass reason for direct allocations
    if (isDirect && (!bypassReason || bypassReason.trim().length < 20)) {
      toast({
        title: "Justification Required",
        description: "Direct allocations require a detailed justification (minimum 20 characters).",
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    const allocationData: FundAllocationFormData = {
      amount: data.amount,
      allocationDate: data.allocationDate.toISOString(),
      goal: data.description || 'General Allocation',
      source: isNC ? 'national_funds' : `site_funds_${user.siteId}`,
      status: 'completed',
      allocatedById: user.id,
      notes: data.description,
      fromSiteId: isSC && user.siteId ? user.siteId : undefined,
      isDirect: isDirect, // NEW: Pass hybrid flag
      bypassReason: isDirect ? bypassReason : undefined, // NEW: Pass justification
      ...(data.recipientType === 'site' && { siteId: data.recipientId }),
      ...(data.recipientType === 'smallGroup' && { smallGroupId: data.recipientId }),
    };

    try {
      const newAllocation = await allocationService.createAllocation(allocationData);
      toast({
        title: "Allocation Saved",
        description: isDirect
          ? "Direct allocation to Small Group created successfully."
          : "Hierarchical allocation created successfully.",
      });
      router.push('/dashboard/finances');
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || "Could not save the allocation.", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => {
    if (isDataLoading) {
      return <Skeleton className="h-64 w-full" />;
    }

    if (recipients.length === 0) {
      return <p>No recipients available to create an allocation.</p>;
    }

    return (
      <div className="space-y-6">
        {/* NEW: Direct Allocation Toggle for NC only */}
        {isNC && (
          <DirectAllocationCheckbox
            isNC={isNC}
            isDirect={isDirect}
            onDirectChange={setIsDirect}
          />
        )}

        {/* NEW: Bypass Reason Textarea (shown only for direct allocations) */}
        {isDirect && (
          <div className="space-y-2">
            <label htmlFor="bypassReason" className="text-sm font-semibold">
              Justification pour Allocation Directe <span className="text-destructive">*</span>
            </label>
            <textarea
              id="bypassReason"
              value={bypassReason}
              onChange={(e) => setBypassReason(e.target.value)}
              placeholder="Expliquez pourquoi cette allocation directe est nécessaire (minimum 20 caractères)..."
              className="w-full min-h-[100px] p-3 border rounded-md"
              minLength={20}
              required
            />
            <p className="text-xs text-muted-foreground">
              {bypassReason.length}/20 caractères minimum
            </p>
          </div>
        )}

        <AllocationForm
          recipients={recipients}
          recipientType={recipientType}
          recipientLabel={
            recipientType === 'site'
              ? 'Recipient Site'
              : isDirect
                ? 'Recipient Small Group (Direct)'
                : 'Recipient Small Group'
          }
          onSubmit={handleCreateAllocation}
          isLoading={isLoading}
        />
      </div>
    );
  }

  const getCardTitle = () => {
    if (isNC) {
      return isDirect
        ? 'Create Direct Allocation (National → Small Group)'
        : 'Create Hierarchical Allocation (National → Site)';
    }
    return 'Create Allocation (Site → Small Group)';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Fund Allocation"
        description="Create a new financial allocation from one entity to another."
      />
      <Card>
        <CardHeader>
          <CardTitle>{getCardTitle()}</CardTitle>
          <CardDescription>
            {isDirect
              ? "⚠️ Exceptional mode: You are bypassing the Site Coordinator hierarchy."
              : "Standard hierarchical allocation following organizational structure."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderForm()}
        </CardContent>
      </Card>
    </div>
  );
}
