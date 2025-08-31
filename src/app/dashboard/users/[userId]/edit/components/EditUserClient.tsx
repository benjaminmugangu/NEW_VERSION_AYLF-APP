// src/app/dashboard/users/[userId]/edit/components/EditUserClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../../../components/UserForm";
import type { UserFormData } from '@/schemas/user';
import type { User } from "@/lib/types";
import { Edit } from "lucide-react";
import { profileService } from '@/services/profileService';
import { useToast } from "@/hooks/use-toast";

interface EditUserClientProps {
  userToEdit: User;
}

export function EditUserClient({ userToEdit }: EditUserClientProps) {
  const router = useRouter();
  const [isUpdatingUser, setIsUpdatingUser] = React.useState(false);
  const [user, setUser] = useState(userToEdit);
  const { toast } = useToast();

  useEffect(() => {
    setUser(userToEdit);
  }, [userToEdit]);

  const handleUpdateUser = async (data: UserFormData) => {
    const { role, ...profileUpdates } = data;
    const userId = user.id;

    try {
      setIsUpdatingUser(true);
      if (role && role !== user.role) {
        const response = await fetch(`/api/users/${userId}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update user role.');
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        await profileService.updateProfile(userId, profileUpdates as Partial<User>);
      }
      
      toast({
        title: "Success",
        description: "User has been updated successfully.",
      });

      router.push(`/dashboard/users/${userId}`);
      router.refresh();
    } catch (error) {
      setIsUpdatingUser(false);
       console.error("Failed to update user:", error);
       toast({
        title: "Error",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <PageHeader
        title={`Edit User: ${userToEdit.name}`}
        description="Modify the details, role, and assignments for this user."
        icon={Edit}
      />
      <UserForm user={userToEdit} onSubmitForm={handleUpdateUser} isSubmitting={isUpdatingUser} />
    </>
  );
}