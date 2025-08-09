// src/app/dashboard/sites/[siteId]/edit/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSites } from '@/hooks/useSites';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { SiteForm } from '../../components/SiteForm';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import type { SiteFormData } from '@/lib/types';
import { Edit, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SiteFormSkeleton } from '@/components/shared/skeletons/SiteFormSkeleton';

export default function EditSitePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const siteId = params.siteId as string;

  const { allSites, updateSite, isUpdating, isLoading } = useSites();

  const siteToEdit = allSites.find(site => site.id === siteId);

  const handleUpdateSite = async (data: SiteFormData) => {
    if (!siteId) return;

    try {
      await updateSite({ id: siteId, siteData: data });
      toast({
        title: 'Site Updated!',
        description: 'The site details have been successfully updated.',
      });
      router.push(`/dashboard/sites/${siteId}`);
    } catch (error) {
      console.error("Erreur détaillée lors de la mise à jour du site:", error);
      toast({
        title: 'Error Updating Site',
        description: (error as Error).message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Edit Site" icon={Edit} description="Loading site details..." />
        <SiteFormSkeleton />
      </RoleBasedGuard>
    );
  }

  if (!siteToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Site Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The site you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.push('/dashboard/sites')} className="mt-4">Back to Sites</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title={`Edit Site: ${siteToEdit.name}`}
        description="Modify the details and coordinator for this site."
        icon={Edit}
      />
      <SiteForm site={siteToEdit} onSubmitForm={handleUpdateSite} isSubmitting={isUpdating} />
    </RoleBasedGuard>
  );
}
