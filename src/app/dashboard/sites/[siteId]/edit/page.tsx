// src/app/dashboard/sites/[siteId]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SiteForm } from "../../components/SiteForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import siteService from '@/services/siteService';
import type { Site, SiteFormData } from "@/lib/types";
import { Edit, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteFormSkeleton } from "@/components/shared/skeletons/SiteFormSkeleton";

export default function EditSitePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const siteId = params.siteId as string;

  const [siteToEdit, setSiteToEdit] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!siteId) {
      setIsLoading(false);
      return;
    }

    const fetchSite = async () => {
      setIsLoading(true);
      try {
        const response = await siteService.getSiteById(siteId);
        if (response.success && response.data) {
          setSiteToEdit(response.data);
        } else {
          setSiteToEdit(null);
        }
      } catch (error) {
        toast({ title: "Error", description: "Could not load site data for editing.", variant: 'destructive' });
        setSiteToEdit(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSite();
  }, [siteId]);

  const handleUpdateSite = async (data: SiteFormData) => {
    if (!siteId) return;

    const result = await siteService.updateSite(siteId, data);

    if (result.success && result.data) {
      toast({
        title: "Site Updated!",
        description: `Site "${result.data.name}" has been successfully updated.`,
      });
      router.push(`/dashboard/sites/${siteId}`);
    } else {
      toast({
        title: "Error Updating Site",
        description: result.error?.message || "An unknown error occurred. Please try again.",
        variant: "destructive",
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
      <SiteForm site={siteToEdit} onSubmitForm={handleUpdateSite} />
    </RoleBasedGuard>
  );
}
