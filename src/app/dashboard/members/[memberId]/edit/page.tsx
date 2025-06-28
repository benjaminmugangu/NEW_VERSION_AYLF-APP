// src/app/dashboard/members/[memberId]/edit/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { MemberForm } from "../../components/MemberForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockMembers } from "@/lib/mockData";
import type { Member, MemberFormData } from "@/lib/types";
import { Edit, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const memberId = params.memberId as string;

  const memberToEdit = mockMembers.find(mem => mem.id === memberId);

  const handleUpdateMember = async (data: MemberFormData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedMember = {
      id: memberId,
      ...data,
      joinDate: data.joinDate.toISOString(),
    };

    // Mock update
    // const index = mockMembers.findIndex(mem => mem.id === memberId);
    // if (index !== -1) mockMembers[index] = updatedMember;
    console.log("Member Updated (mock):", updatedMember);

    toast({
      title: "Member Updated!",
      description: `Member "${updatedMember.name}" has been successfully updated.`,
    });
    router.push(`/dashboard/members/${memberId}`);
  };

  if (!memberToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Member Not Found" icon={Info} />
         <Card>
          <CardContent className="pt-6">
            <p>The member you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.push('/dashboard/members')} className="mt-4">Back to Members</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }
  
  // TODO: Add role-based checks for editing eligibility

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title={`Edit Member: ${memberToEdit.name}`}
        description="Modify the details of the existing member."
        icon={Edit}
      />
      <MemberForm member={memberToEdit} onSubmitForm={handleUpdateMember} />
    </RoleBasedGuard>
  );
}
