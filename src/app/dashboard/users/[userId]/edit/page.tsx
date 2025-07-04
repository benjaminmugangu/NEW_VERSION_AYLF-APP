// src/app/dashboard/users/[userId]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import userService from "@/services/userService";
import type { User, UserFormData } from "@/lib/types";
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
        const response = await userService.getUserById(userId);
        if (response.success && response.data) {
          setUserToEdit(response.data);
        } else {
          console.error("Failed to fetch user:", response.error);
          setUserToEdit(null);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUserToEdit(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleUpdateUser = async (data: UserFormData) => {
    if (!userId) return;

    const result = await userService.updateUser(userId, data);

    if (result.success && result.data) {
      toast({
        title: "User Updated!",
        description: `User "${result.data.name}" has been successfully updated.`,
      });
      router.push("/dashboard/users");
    } else {
      console.error("Failed to update user:", result.error);
      toast({
        title: "Error Updating User",
        description: result.error || "An unknown error occurred. Please try again.",
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
