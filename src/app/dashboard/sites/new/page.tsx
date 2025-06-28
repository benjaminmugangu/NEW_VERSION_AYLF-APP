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
import { mockSites } from "@/lib/mockData"; 

export default function NewSitePage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateSite = async (data: SiteFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newSite = {
      id: `site_${data.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      name: data.name,
      coordinatorId: data.coordinatorId || undefined, // coordinatorId is now a name string
    };
    
    // This is a mock "save". 
    // mockSites.push(newSite); // This won't persist across reloads unless mockData is handled in a stateful way or via a service
    
    console.log("New Site Created (mock):", newSite);
    // Note: The previous logic to update mockUsers (assigning siteId to the coordinator user)
    // has been removed as coordinatorId is now just a name.
    // User role and site assignments should be managed via the User Management section.

    toast({
      title: "Site Created!",
      description: `Site "${newSite.name}" has been successfully created.`,
    });
    router.push("/dashboard/sites"); // Redirect to sites list
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
