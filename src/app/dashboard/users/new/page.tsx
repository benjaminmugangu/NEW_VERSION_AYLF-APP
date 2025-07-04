// src/app/dashboard/users/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { UserPlus } from "lucide-react";
import { type UserFormData } from "../components/UserForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function NewUserPage() {
  const { toast } = useToast();
  const router = useRouter();

    const handleInviteUser = async (data: UserFormData) => {
    console.log('Data received by handleInviteUser:', data);
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation.');
      }

      toast({
        title: "Invitation Sent!",
        description: `An invitation has been sent to ${data.email}.`,
      });
      router.push("/dashboard/users");

    } catch (error: any) {
      console.error("Failed to invite user:", error);
      toast({
        title: "Error Sending Invitation",
        description: error.message || "An unknown error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Add New User"
        description="Create a new user account and assign roles and permissions."
        icon={UserPlus}
      />
      <UserForm onSubmitForm={handleInviteUser} />
    </RoleBasedGuard>
  );
}
