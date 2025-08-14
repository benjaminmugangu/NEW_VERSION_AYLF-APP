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
import memberService from "@/services/memberService";

export default function NewMemberPage() {
  const { toast } = useToast();
  const router = useRouter();

    const handleCreateMember = async (data: MemberFormData) => {
    try {
      await memberService.createMember(data);

      toast({
        title: "Member Added!",
        description: `Member "${data.name}" has been successfully added.`,
      });
      router.push("/dashboard/members");

    } catch (error) {
      toast({
        title: "Error Creating Member",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
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
