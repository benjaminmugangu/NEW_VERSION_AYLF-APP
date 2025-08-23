// src/app/dashboard/sites/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { SiteForm } from "../components/SiteForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { PlusCircle } from "lucide-react";
import type { SiteFormData } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useSites } from '@/hooks/useSites';

export default function NewSitePage() {
  const router = useRouter();
  const { createSite, isCreating } = useSites();

  const handleCreateSite = async (data: SiteFormData) => {
    try {
      await createSite(data);
      router.push("/dashboard/sites");
    } catch (error) {
      // The hook handles the error toast.
      // The try/catch is just to prevent redirecting on failure.
    }
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Add New Site"
        description="Establish a new operational site within AYLF."
        icon={PlusCircle}
      />
      <SiteForm onSubmitForm={handleCreateSite} isSubmitting={isCreating} />
    </RoleBasedGuard>
  );
}
