// src/app/dashboard/sites/[siteId]/small-groups/[smallGroupId]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SmallGroupForm } from "@/app/dashboard/sites/components/SmallGroupForm";
import type { SmallGroupFormData } from '@/lib/types';
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { siteService } from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import type { Site, SmallGroup as SmallGroupType } from "@/lib/types";
import { Edit, Info, Users as UsersIcon } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function EditSmallGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const siteId = params.siteId as string;
  const smallGroupId = params.smallGroupId as string;

  const [site, setSite] = useState<Site | null>(null);
  const [smallGroupToEdit, setSmallGroupToEdit] = useState<SmallGroupType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!siteId || !smallGroupId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      console.log(`[DEBUG] Fetching data for siteId: ${siteId}, smallGroupId: ${smallGroupId}`);
      try {
        const siteResponse: { success: boolean; data?: Site; error?: any } = await siteService.getSiteById(siteId);
        console.log('[DEBUG] Site Response:', JSON.stringify(siteResponse, null, 2));

        const sgResponse: { success: boolean; data?: SmallGroupType; error?: any } = await smallGroupService.getSmallGroupDetails(smallGroupId);
        console.log('[DEBUG] Small Group Response:', JSON.stringify(sgResponse, null, 2));

        const siteIdFromUrl = siteId;
        const siteIdFromSg = sgResponse.data?.siteId;

        const check = {
          siteSuccess: siteResponse.success,
          siteHasData: !!siteResponse.data,
          sgSuccess: sgResponse.success,
          sgHasData: !!sgResponse.data,
          idsMatch: siteIdFromSg === siteIdFromUrl
        };
        console.log('[DEBUG] Validation Check:', check);
        console.log(`[DEBUG] Comparing URL siteId '${siteIdFromUrl}' with DB siteId '${siteIdFromSg}'`);

        if (check.siteSuccess && check.siteHasData && check.sgSuccess && check.sgHasData && check.idsMatch) {
          console.log('[DEBUG] Validation SUCCESS. Setting state.');
          setSite(siteResponse.data || null);
          setSmallGroupToEdit(sgResponse.data || null);
        } else {
          console.error('[DEBUG] Validation FAILED. Displaying error.');
          setSite(null);
          setSmallGroupToEdit(null);
          toast({ title: "Error", description: "Could not load data for editing.", variant: 'destructive' });
        }
      } catch (error) {
        console.error("Erreur détaillée lors de la récupération des données du groupe:", error);
        console.error('[DEBUG] An exception occurred during fetch:', error);
        toast({ title: "Error", description: "Could not load data for editing.", variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [siteId, smallGroupId]);

  const handleUpdateSmallGroup = async (data: SmallGroupFormData) => {
    try {
      const result = await smallGroupService.updateSmallGroup(smallGroupId, data);
      if (result.success && result.data) {
        toast({
          title: "Small Group Updated!",
          description: `Small Group "${result.data.name}" has been successfully updated.`,
        });
        router.push(`/dashboard/sites/${siteId}`);
      } else {
        throw new Error(result.error?.message || "Update failed");
      }
    } catch (error) {
      console.error("Erreur détaillée lors de la mise à jour du groupe:", error);
      toast({
        title: "Error",
        description: "Could not update the small group. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Loading..." icon={UsersIcon} />
      </RoleBasedGuard>
    );
  }

  if (!site || !smallGroupToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Small Group Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The small group you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.push(siteId ? `/dashboard/sites/${siteId}` : '/dashboard/sites')} className="mt-4">
              Back to Site Details
            </Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  if (currentUser?.role !== ROLES.NATIONAL_COORDINATOR) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Access Denied" icon={Info} />
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title={`Edit Small Group: ${smallGroupToEdit.name}`}
        description={`Modifying details for "${smallGroupToEdit.name}" within ${site.name}.`}
        icon={UsersIcon}
      />
      <SmallGroupForm
        smallGroup={smallGroupToEdit}
        siteId={siteId}
        onSubmitForm={handleUpdateSmallGroup}
      />
    </RoleBasedGuard>
  );
}
