// src/app/dashboard/sites/[siteId]/edit/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SiteForm } from "../../components/SiteForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockSites } from "@/lib/mockData";
import type { SiteFormData } from "@/lib/types";
import { Edit, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EditSitePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const siteId = params.siteId as string;

  const siteToEdit = mockSites.find(s => s.id === siteId);

  const handleUpdateSite = async (data: SiteFormData) => {
    if (!siteToEdit) return;

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update site in mockSites
    // data.coordinatorId is now the name string from the form
    const siteIndex = mockSites.findIndex(s => s.id === siteId);
    if (siteIndex !== -1) {
      mockSites[siteIndex] = { 
        ...mockSites[siteIndex], 
        name: data.name,
        coordinatorId: data.coordinatorId || undefined, 
      };
    }

    console.log("Site Updated (mock):", mockSites[siteIndex]);
    // Note: The previous logic to update mockUsers (assigning/unassigning siteId to coordinator users)
    // has been removed as coordinatorId from the form is now just a name.
    // User role and site assignments should be managed via the User Management section.

    toast({
      title: "Site Updated!",
      description: `Site "${data.name}" has been successfully updated.`,
    });
    router.push(`/dashboard/sites/${siteId}`); 
  };

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
      <SiteForm site={siteToEdit} onSubmitForm={handleUpdateSite} />
    </RoleBasedGuard>
  );
}
