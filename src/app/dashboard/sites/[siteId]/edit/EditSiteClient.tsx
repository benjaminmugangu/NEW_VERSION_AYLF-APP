"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { SiteForm } from '../../components/SiteForm';
import type { Site, SiteFormData } from '@/lib/types';
import { Edit } from 'lucide-react';
import siteService from '@/services/siteService';

interface EditSiteClientProps {
  site: Site;
}

export default function EditSiteClient({ site }: EditSiteClientProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleUpdateSite = async (data: SiteFormData) => {
    setIsUpdating(true);
    try {
      await siteService.updateSite(site.id, data);
      // On success, redirect to the site detail page to see the changes.
      router.push(`/dashboard/sites/${site.id}`);
      // Optionally, trigger a router refresh to ensure data is fresh if not redirecting
      // router.refresh();
    } catch (error) {
      // The service throws an error, which could be caught here to display a notification.
      // For now, we rely on a global error handler or the service itself might show a toast.
      console.error("Failed to update site:", error);
      // Re-enable the form if the update fails.
      setIsUpdating(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Edit Site: ${site.name}`}
        description="Modify the details and coordinator for this site."
        icon={Edit}
      />
      <SiteForm site={site} onSubmitForm={handleUpdateSite} isSubmitting={isUpdating} />
    </>
  );
}
