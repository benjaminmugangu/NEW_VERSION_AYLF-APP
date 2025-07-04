// src/app/dashboard/sites/[siteId]/small-groups/new/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { SmallGroupForm, type SmallGroupFormData } from '@/app/dashboard/sites/components/SmallGroupForm';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import smallGroupService from '@/services/smallGroupService';
import { useToast } from '@/hooks/use-toast';
import { Users as UsersIcon, PlusCircle } from 'lucide-react';

export default function NewSmallGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const siteId = params.siteId as string;

  const handleCreateSmallGroup = async (data: SmallGroupFormData) => {
    try {
      const result = await smallGroupService.createSmallGroup(siteId, data);
      if (result.success && result.data) {
        toast({
          title: 'Small Group Created!',
          description: `Small Group "${result.data.name}" has been successfully created.`,
        });
        router.push(`/dashboard/sites/${siteId}`);
      } else {
        throw new Error(result.error || 'Failed to create small group');
      }
    } catch (error) {
      console.error('Failed to create small group:', error);
      toast({
        title: 'Error',
        description: 'Could not create the small group. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title="Add New Small Group"
        description="Establish a new small group within this site."
        icon={PlusCircle}
      />
      <SmallGroupForm siteId={siteId} onSubmitForm={handleCreateSmallGroup} />
    </RoleBasedGuard>
  );
}
