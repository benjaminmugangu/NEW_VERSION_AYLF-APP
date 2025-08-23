// src/app/dashboard/users/[userId]/edit/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import type { User } from "@/lib/types";
import type { UserFormData } from "../../components/UserForm";
import { Edit, Info } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const { user: userToEdit, isLoading, isError } = useUser(userId);
  const { updateUser, isUpdatingUser } = useUsers();

  const handleUpdateUser = async (data: UserFormData) => {
    if (!userId) return;

    try {
      await updateUser({ userId, updates: data as Partial<User> });
      router.push('/dashboard/users');
    } catch (error) {
      // Error is handled by the useUsers hook, which displays a toast.
      // This try/catch block prevents navigation on failure.
    }
  };

  if (isLoading) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="Loading..." icon={Edit} />
        <Card>
          <CardContent className="pt-6">
            <p>Loading user details for editing...</p>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  if (isError || !userToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
        <PageHeader title="User Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The user you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.push('/dashboard/users')} className="mt-4">Back to Users</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title={`Edit User: ${userToEdit.name}`}
        description="Modify the details, role, and assignments for this user."
        icon={Edit}
      />
      <UserForm user={userToEdit} onSubmitForm={handleUpdateUser} isSubmitting={isUpdatingUser} />
    </RoleBasedGuard>
  );
}
