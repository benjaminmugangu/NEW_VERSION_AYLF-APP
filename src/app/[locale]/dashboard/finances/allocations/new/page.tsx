"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from "@/components/shared/PageHeader";
import { AllocationForm } from '@/app/[locale]/dashboard/finances/components/AllocationForm';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/lib/constants';
import type { FundAllocationFormData, Site, SmallGroup } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const recipientType = user?.role === ROLES.NATIONAL_COORDINATOR ? 'site' : 'smallGroup';

  useEffect(() => {
    const fetchRecipients = async () => {
      if (!user) return;
      setIsDataLoading(true);
      try {
        if (user.role === ROLES.NATIONAL_COORDINATOR) {
          const sites = await siteService.getSitesWithDetails(user);
          setRecipients(sites);
        } else if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
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
  }, [user, toast]);

  const handleCreateAllocation = async (data: any) => {
    if (!user) return;
    setIsLoading(true);

    const allocationData: FundAllocationFormData = {
      amount: data.amount,
      allocationDate: data.allocationDate.toISOString(),
      goal: data.description || 'General Allocation',
      source: user.role === ROLES.NATIONAL_COORDINATOR ? 'national_funds' : `site_funds_${user.siteId}`,
      status: 'completed',
      allocatedById: user.id,
      notes: data.description,
      ...(data.recipientType === 'site' && { siteId: data.recipientId }),
      ...(data.recipientType === 'smallGroup' && { smallGroupId: data.recipientId }),
    };

    try {
      const newAllocation = await allocationService.createAllocation(allocationData);
      toast({
        title: "Allocation Saved",
        description: `The allocation has been successfully recorded.`,
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
      <AllocationForm
        recipients={recipients}
        recipientType={recipientType}
        recipientLabel={recipientType === 'site' ? 'Recipient Site' : 'Recipient Small Group'}
        onSubmit={handleCreateAllocation}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Fund Allocation"
        description="Create a new financial allocation from one entity to another."
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {recipientType === 'site' ? 'Create Allocation (National → Site)' : 'Create Allocation (Site → Small Group)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderForm()}
        </CardContent>
      </Card>
    </div>
  );
}
