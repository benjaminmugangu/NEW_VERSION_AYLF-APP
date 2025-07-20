// src/app/dashboard/members/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { MemberForm } from "../components/MemberForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { UserPlus } from "lucide-react";
import type { MemberFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function NewMemberPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateMember = async (data: MemberFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newMember = {
      id: `mem_${Date.now()}`,
      ...data,
      joinDate: data.joinDate.toISOString(), // Convert Date object to ISO string
    };
    
    // mockMembers.unshift(newMember); 


    toast({
      title: "Member Added!",
      description: `Member "${newMember.name}" has been successfully added.`,
    });
    router.push("/dashboard/members"); // Redirect to members list
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Add New Member"
        description="Register a new participant in the AYLF network."
        icon={UserPlus}
      />
      <MemberForm onSubmitForm={handleCreateMember} />
    </RoleBasedGuard>
  );
}
