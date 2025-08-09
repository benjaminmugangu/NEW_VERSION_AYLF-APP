// src/app/dashboard/sites/[siteId]/small-groups/[smallGroupId]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SmallGroupForm } from "@/app/dashboard/sites/components/SmallGroupForm";
import type { SmallGroupFormData } from '@/lib/types';
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import siteService from '@/services/siteService';
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
      try {
        const siteData = await siteService.getSiteById(siteId);
        const sgData = await smallGroupService.getSmallGroupDetails(smallGroupId);

        if (siteData && sgData && sgData.siteId === siteId) {
          setSite(siteData);
          setSmallGroupToEdit(sgData);
        } else {
          setSite(null);
          setSmallGroupToEdit(null);
          toast({ title: "Error", description: "Could not load data for editing or data is mismatched.", variant: 'destructive' });
        }
      } catch (error) {
        console.error("Error fetching data for edit page:", error);
        toast({ title: "Error", description: "Could not load data for editing.", variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [siteId, smallGroupId]);

  const handleUpdateSmallGroup = async (data: SmallGroupFormData) => {
    try {
      const updatedSmallGroup = await smallGroupService.updateSmallGroup(smallGroupId, data);
      toast({
        title: "Small Group Updated!",
        description: `Small Group "${updatedSmallGroup.name}" has been successfully updated.`,
      });
      router.push(`/dashboard/sites/${siteId}`);
    } catch (error) {
      console.error("Error updating small group:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not update the small group. Please try again.",
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
