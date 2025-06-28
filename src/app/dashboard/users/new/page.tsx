// src/app/dashboard/users/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { UserForm } from "../components/UserForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { UserPlus } from "lucide-react";
import type { UserFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { mockUsers } from "@/lib/mockData";

export default function NewUserPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateUser = async (data: UserFormData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser = {
      id: `user_${Date.now()}`,
      ...data,
      mandateStartDate: data.mandateStartDate?.toISOString(),
      mandateEndDate: data.mandateEndDate?.toISOString(),
    };
    
    // mockUsers.push(newUser); // For mock persistence
    console.log("New User Created (mock):", newUser);

    toast({
      title: "User Created!",
      description: `User "${newUser.name}" has been successfully created with role ${newUser.role.replace(/_/g, ' ')}.`,
    });
    router.push("/dashboard/users");
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Add New User"
        description="Create a new user account and assign roles and permissions."
        icon={UserPlus}
      />
      <UserForm onSubmitForm={handleCreateUser} />
    </RoleBasedGuard>
  );
}
