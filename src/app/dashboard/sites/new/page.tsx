// src/app/dashboard/sites/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { SiteForm } from "../components/SiteForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Building, PlusCircle } from "lucide-react";
import type { SiteFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import siteService from '@/services/siteService'; 

export default function NewSitePage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateSite = async (data: SiteFormData) => {
    const result = await siteService.createSite(data);

    if (result.success && result.data) {
      toast({
        title: "Site Created!",
        description: `Site "${result.data.name}" has been successfully created.`,
      });
      router.push("/dashboard/sites");
    } else {
      toast({
        title: "Error Creating Site",
        description: result.error?.message || "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Add New Site"
        description="Establish a new operational site within AYLF."
        icon={PlusCircle}
      />
      <SiteForm onSubmitForm={handleCreateSite} />
    </RoleBasedGuard>
  );
}
