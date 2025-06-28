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
import { mockActivities } from "@/lib/mockData"; // For mock "saving"

export default function NewActivityPage() {
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateActivity = async (data: ActivityFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newActivity = {
      id: `act_${Date.now()}`,
      ...data,
      date: data.date.toISOString(), // Convert Date object to ISO string
      participantsCount: data.participantsCount ?? undefined, // Ensure undefined if null
      imageUrl: data.imageUrl || undefined,
    };
    
    // This is a mock "save". In a real app, you'd POST to an API.
    // For demonstration, we could try to update mockActivities if it's mutable and accessible,
    // but direct mutation of imported mockData is not a good practice for real apps.
    // mockActivities.unshift(newActivity); 
    console.log("New Activity Created (mock):", newActivity);

    toast({
      title: "Activity Created!",
      description: `Activity "${newActivity.name}" has been successfully created.`,
    });
    router.push("/dashboard/activities"); // Redirect to activities list
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
