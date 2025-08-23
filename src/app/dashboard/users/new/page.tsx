// src/app/dashboard/users/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { UserPlus } from "lucide-react";
import { type UserFormData } from "../components/UserForm";
import { useRouter } from "next/navigation";
import { useUsers } from "@/hooks/useUsers";

interface InviteResponse {
  password?: string;
  error?: { message: string } | string;
}

export default function NewUserPage() {
  const router = useRouter();
  const { createUser, isCreatingUser } = useUsers();

  const handleInviteUser = async (data: UserFormData) => {
    try {
      await createUser(data);
      router.push('/dashboard/users');
    } catch (error) {
      // The hook handles the error toast.
      // This try/catch is to prevent navigation on failure.
    }
  };

  

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Invite New User"
        description="Create a new user account. An invitation email will be sent to them to set their password."
        icon={UserPlus}
      />
      <UserForm onSubmitForm={handleInviteUser} isSubmitting={isCreatingUser} />
    </RoleBasedGuard>
  );
}
