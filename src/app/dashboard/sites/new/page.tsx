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
import { useSites } from '@/hooks/useSites';

export default function NewSitePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { createSite, isCreating } = useSites();

  const handleCreateSite = async (data: SiteFormData) => {
    try {
      await createSite(data);
      toast({
        title: "Site Created!",
        description: `The site has been successfully created.`,
      });
      router.push("/dashboard/sites");
    } catch (error) {
      console.error("Erreur détaillée lors de la création du site:", error);
      toast({
        title: "Error Creating Site",
        description: (error as Error).message || "An unknown error occurred. Please try again.",
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
      <SiteForm onSubmitForm={handleCreateSite} isSubmitting={isCreating} />
    </RoleBasedGuard>
  );
}
