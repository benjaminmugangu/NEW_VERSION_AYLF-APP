// src/app/dashboard/users/[userId]/edit/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockUsers } from "@/lib/mockData";
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

  const userToEdit = mockUsers.find(u => u.id === userId);

  const handleUpdateUser = async (data: UserFormData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedUser: User = {
      id: userId,
      ...data,
      mandateStartDate: data.mandateStartDate?.toISOString(),
      mandateEndDate: data.mandateEndDate?.toISOString(),
    };

    // Mock update
    // const index = mockUsers.findIndex(u => u.id === userId);
    // if (index !== -1) mockUsers[index] = updatedUser;
    console.log("User Updated (mock):", updatedUser);

    toast({
      title: "User Updated!",
      description: `User "${updatedUser.name}" has been successfully updated.`,
    });
    router.push("/dashboard/users");
  };

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
