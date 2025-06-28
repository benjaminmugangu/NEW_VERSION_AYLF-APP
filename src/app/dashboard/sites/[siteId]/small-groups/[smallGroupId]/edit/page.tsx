// src/app/dashboard/sites/[siteId]/small-groups/[smallGroupId]/edit/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SmallGroupForm, type SmallGroupFormData } from "../../../../components/SmallGroupForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockSites, mockSmallGroups, mockUsers } from "@/lib/mockData";
import type { SmallGroup as SmallGroupType, User } from "@/lib/types";
import { Edit, Info, Users as UsersIcon } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function EditSmallGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const siteId = params.siteId as string;
  const smallGroupId = params.smallGroupId as string;

  const site = mockSites.find(s => s.id === siteId);
  const smallGroupToEdit = mockSmallGroups.find(sg => sg.id === smallGroupId && sg.siteId === siteId);

  const handleUpdateSmallGroup = async (data: SmallGroupFormData) => {
    if (!smallGroupToEdit) return;

    await new Promise(resolve => setTimeout(resolve, 1000));

    const oldLeaderId = smallGroupToEdit.leaderId;
    const newLeaderId = data.leaderId;
    const oldLogisticsId = smallGroupToEdit.logisticsAssistantId;
    const newLogisticsId = data.logisticsAssistantId;
    const oldFinanceId = smallGroupToEdit.financeAssistantId;
    const newFinanceId = data.financeAssistantId;

    // Helper to update user assignment
    const updateUserAssignment = (userIdToUpdate: string | undefined, newSgId: string | undefined, newSiteId: string, isPrimaryLeader: boolean) => {
      if (!userIdToUpdate) return;
      const userIndex = mockUsers.findIndex(u => u.id === userIdToUpdate);
      if (userIndex !== -1) {
        // If user is being assigned, set their SG and site
        if (newSgId) {
          // If user was previously a leader/assistant of another SG, clear that old SG's leader/assistant field
          if (mockUsers[userIndex].smallGroupId && mockUsers[userIndex].smallGroupId !== newSgId) {
            const prevSgIndex = mockSmallGroups.findIndex(sg => sg.id === mockUsers[userIndex].smallGroupId);
            if (prevSgIndex !== -1) {
              if (mockSmallGroups[prevSgIndex].leaderId === userIdToUpdate) mockSmallGroups[prevSgIndex].leaderId = undefined;
              if (mockSmallGroups[prevSgIndex].logisticsAssistantId === userIdToUpdate) mockSmallGroups[prevSgIndex].logisticsAssistantId = undefined;
              if (mockSmallGroups[prevSgIndex].financeAssistantId === userIdToUpdate) mockSmallGroups[prevSgIndex].financeAssistantId = undefined;
            }
          }
          mockUsers[userIndex].smallGroupId = newSgId;
          mockUsers[userIndex].siteId = newSiteId; // Assign site ID as well
          // Ensure role is SGL if they are not NC or SC
          if (isPrimaryLeader && mockUsers[userIndex].role !== ROLES.NATIONAL_COORDINATOR && mockUsers[userIndex].role !== ROLES.SITE_COORDINATOR) {
            mockUsers[userIndex].role = ROLES.SMALL_GROUP_LEADER;
          }
        } else { // User is being unassigned from this SG
          if (mockUsers[userIndex].smallGroupId === smallGroupId) { // Only clear if they were assigned to *this* SG
            mockUsers[userIndex].smallGroupId = undefined;
            // Optionally, revert role if they are no longer leading any SG, but this is complex. For now, role stays.
          }
        }
      }
    };
    
    // Main leader
    if (oldLeaderId !== newLeaderId) {
      updateUserAssignment(oldLeaderId, undefined, siteId, true); // Unassign old
      updateUserAssignment(newLeaderId, smallGroupId, siteId, true); // Assign new
    }
    // Logistics assistant
    if (oldLogisticsId !== newLogisticsId) {
      updateUserAssignment(oldLogisticsId, undefined, siteId, false);
      updateUserAssignment(newLogisticsId, smallGroupId, siteId, false);
    }
    // Finance assistant
    if (oldFinanceId !== newFinanceId) {
      updateUserAssignment(oldFinanceId, undefined, siteId, false);
      updateUserAssignment(newFinanceId, smallGroupId, siteId, false);
    }
    
    const sgIndex = mockSmallGroups.findIndex(sg => sg.id === smallGroupId);
    if (sgIndex !== -1) {
      mockSmallGroups[sgIndex] = { 
        ...mockSmallGroups[sgIndex], 
        name: data.name,
        leaderId: data.leaderId,
        logisticsAssistantId: data.logisticsAssistantId,
        financeAssistantId: data.financeAssistantId,
        siteId: siteId // Ensure siteId remains consistent
      }; 
    }

    console.log("Small Group Updated (mock):", mockSmallGroups[sgIndex]);
    // console.log("Users Updated (mock):", mockUsers.filter(u => 
    //   [oldLeaderId, newLeaderId, oldLogisticsId, newLogisticsId, oldFinanceId, newFinanceId].includes(u.id)
    // ));


    toast({
      title: "Small Group Updated!",
      description: `Small Group "${data.name}" has been successfully updated.`,
    });
    router.push(`/dashboard/sites/${siteId}`); 
  };

  if (!site || !smallGroupToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Small Group Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The small group you are looking for (within the specified site) does not exist or could not be found.</p>
            <Button onClick={() => router.push(siteId ? `/dashboard/sites/${siteId}` : '/dashboard/sites')} className="mt-4">
              {siteId ? `Back to ${site?.name || 'Site Details'}` : 'Back to Sites'}
            </Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }
  
  const canEdit = currentUser?.role === ROLES.NATIONAL_COORDINATOR;

  if (!canEdit) { 
     return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Access Denied" description="You do not have permission to edit this small group." icon={Info} />
         <Button onClick={() => router.push(`/dashboard/sites/${siteId}`)} className="mt-4">
            Back to {site.name}
          </Button>
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
