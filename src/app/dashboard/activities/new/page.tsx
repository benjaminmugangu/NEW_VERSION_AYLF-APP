// src/app/dashboard/activities/new/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityForm } from "../components/ActivityForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Activity as ActivityIcon, PlusCircle } from "lucide-react";
import type { ActivityFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import activityService from "@/services/activityService";

export default function NewActivityPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateActivity = async (data: ActivityFormData) => {
    const result = await activityService.createActivity(data);

    if (result.success && result.data) {
      toast({
        title: "Activity Created!",
        description: `Activity "${result.data.name}" has been successfully created.`,
      });
      router.push("/dashboard/activities");
    } else {
      toast({
        title: "Error Creating Activity",
        description: result.error || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Create New Activity"
        description="Define the details for a new activity at the appropriate level."
        icon={PlusCircle}
      />
      <ActivityForm onSubmitForm={handleCreateActivity} />
    </RoleBasedGuard>
  );
}
