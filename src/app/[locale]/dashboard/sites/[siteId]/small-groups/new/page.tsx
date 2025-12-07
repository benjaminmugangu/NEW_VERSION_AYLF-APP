// src/app/dashboard/sites/[siteId]/small-groups/new/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { SmallGroupForm } from '@/app/[locale]/dashboard/sites/components/SmallGroupForm';
import type { SmallGroupFormData, SmallGroup } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import * as smallGroupService from '@/services/smallGroupService';
import { useToast } from '@/hooks/use-toast';
import { Users as UsersIcon, PlusCircle } from 'lucide-react';

export default function NewSmallGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const siteId = params.siteId as string;

  const handleCreateSmallGroup = async (data: SmallGroupFormData) => {
    try {
      const newSmallGroup = await smallGroupService.createSmallGroup(siteId, data);
      toast({
        title: 'Small Group Created!',
        description: `Small Group "${newSmallGroup.name}" has been successfully created.`,
      });
      router.push(`/dashboard/sites/${siteId}`);
    } catch (error) {
      console.error("Erreur détaillée lors de la création du groupe:", error);
      const errorMessage = error instanceof Error ? error.message : 'Could not create the small group. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Add New Small Group"
        description="Establish a new small group within this site."
        icon={PlusCircle}
      />
      <SmallGroupForm siteId={siteId} onSubmitForm={handleCreateSmallGroup} />
    </>
  );
}
