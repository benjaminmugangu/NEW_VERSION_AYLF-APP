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
import { useUsers } from "@/hooks/useUsers";

interface InviteResponse {
  password?: string;
  error?: { message: string } | string;
}

export default function NewUserPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { createUser, isCreatingUser } = useUsers();

  const handleInviteUser = async (data: UserFormData) => {
    createUser(data, {
      onSuccess: (newUser) => {
        toast({
          title: "User Invited Successfully!",
          description: `An invitation has been sent to ${newUser.email}.`,
        });
        router.push('/dashboard/users');
        router.refresh(); // To ensure the list is updated
      },
      onError: (error) => {
        toast({
          title: "Error Creating User",
          description: error.message || "An unknown error occurred. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Invite New User"
        description="Create a new user account. An invitation email will be sent to them to set their password."
        icon={UserPlus}
      />
      <UserForm onSubmitForm={handleInviteUser} />
    </RoleBasedGuard>
  );
}
