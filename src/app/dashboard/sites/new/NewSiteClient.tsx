"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { SiteForm } from '../components/SiteForm';
import type { SiteFormData } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import * as siteService from '@/services/siteService';

export default function NewSiteClient() {
  const router = useRouter();
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreateSite = async (data: SiteFormData) => {
    setIsCreating(true);
    try {
      await siteService.createSite(data);
      router.push('/dashboard/sites');
    } catch (error) {
      console.error('Failed to create site:', error);
      // Re-enable the form if creation fails
      setIsCreating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Add New Site"
        description="Establish a new operational site within AYLF."
        icon={PlusCircle}
      />
      <SiteForm onSubmitForm={handleCreateSite} isSubmitting={isCreating} />
    </>
  );
}
