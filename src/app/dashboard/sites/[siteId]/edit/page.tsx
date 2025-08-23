// src/app/dashboard/sites/[siteId]/edit/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSiteDetails } from '@/hooks/useSiteDetails';
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
  const siteId = params.siteId as string;

  const { site: siteToEdit, isLoading, error, updateSite, isUpdatingSite: isUpdating } = useSiteDetails(siteId);

  const handleUpdateSite = async (data: SiteFormData) => {
    if (!siteId) return;

    try {
            await updateSite(data);
      router.push(`/dashboard/sites/${siteId}`);
    } catch (err) {
      // Error is handled by the hook, which displays a toast.
      // This try/catch prevents redirecting on failure.
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

  if (error || !siteToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Site Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>{(error as Error)?.message || 'The site you are looking for does not exist.'}</p>
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
