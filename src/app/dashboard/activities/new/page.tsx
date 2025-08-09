// src/app/dashboard/activities/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityForm } from "../components/ActivityForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Activity as ActivityIcon, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Activity } from "@/lib/types";

export default function NewActivityPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleSuccessfulCreate = (newActivity: Activity) => {
    toast({
      title: "Activity Created!",
      description: `Activity "${newActivity.title}" has been successfully created.`,
    });
    router.push("/dashboard/activities");
  };

  const handleCancel = () => {
    router.push("/dashboard/activities");
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Create New Activity"
        description="Define the details for a new activity at the appropriate level."
        icon={PlusCircle}
      />
      <ActivityForm onSave={handleSuccessfulCreate} onCancel={handleCancel} />
    </RoleBasedGuard>
  );
}
