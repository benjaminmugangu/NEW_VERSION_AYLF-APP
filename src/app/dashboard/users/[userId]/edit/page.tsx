// src/app/dashboard/users/[userId]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { profileService } from "@/services/profileService";
import type { User } from "@/lib/types";
import type { UserFormData } from "../../components/UserForm";
import { Edit, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const userId = params.userId as string;

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const response = await profileService.getProfile(userId);
        if (response.success && response.data) {
          setUserToEdit(response.data);
        } else {

          setUserToEdit(null);
        }
      } catch (error) {

        setUserToEdit(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleUpdateUser = async (data: UserFormData) => {
    if (!userId) {
        toast({
            title: "Error",
            description: "User ID is missing. Cannot update.",
            variant: "destructive",
        });
        return;
    }

    // Force cast the form data to Partial<User> to bypass the persistent type error.
    // This is a temporary workaround. The Supabase client should handle Date object serialization.
    const result = await profileService.updateProfile(userId, data as Partial<User>);

    if (result.success) {
        toast({
            title: "User Updated",
            description: `Profile for ${data.name} has been successfully updated.`,
        });
        router.push('/dashboard/users');
    } else {
        toast({
            title: "Update Failed",
            description: result.error?.message || "An unknown error occurred.",
            variant: "destructive",
        });
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

  if (!userToEdit) {
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
      <UserForm user={userToEdit} onSubmitForm={handleUpdateUser} />
    </RoleBasedGuard>
  );
}
