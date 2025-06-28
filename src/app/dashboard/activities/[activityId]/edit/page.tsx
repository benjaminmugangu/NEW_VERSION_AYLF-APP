// src/app/dashboard/activities/[activityId]/edit/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityForm } from "../../components/ActivityForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockActivities } from "@/lib/mockData";
import type { Activity, ActivityFormData } from "@/lib/types";
import { Edit, Info, ShieldAlert } from "lucide-react"; // Added ShieldAlert
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Added CardDescription, CardHeader, CardTitle
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth"; // Added useAuth
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton

export default function EditActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth(); // Get currentUser
  const activityId = params.activityId as string;

  // In a real app, fetch activity data here based on ID
  const activityToEdit = mockActivities.find(act => act.id === activityId);

  const handleUpdateActivity = async (data: ActivityFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedActivity = {
      id: activityId,
      ...data,
      date: data.date.toISOString(),
      participantsCount: data.participantsCount ?? undefined,
      imageUrl: data.imageUrl || undefined,
    };

    // Mock update
    const index = mockActivities.findIndex(act => act.id === activityId);
    if (index !== -1) {
      // mockActivities[index] = updatedActivity; // This won't work as expected due to module caching/immutability for mock data
      console.log("Activity Updated (mock):", updatedActivity);
    }

    toast({
      title: "Activity Updated!",
      description: `Activity "${updatedActivity.name}" has been successfully updated.`,
    });
    router.push(`/dashboard/activities/${activityId}`); // Redirect to activity detail page
  };

  if (authIsLoading) {
     return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Loading Activity..." icon={Edit} />
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-1/3" />
            </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  if (!activityToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Activity Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The activity you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.push('/dashboard/activities')} className="mt-4">Back to Activities</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }
  
  let canEditThisSpecificActivity = false;
  if (currentUser) {
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
      canEditThisSpecificActivity = true;
    } else if (currentUser.role === ROLES.SITE_COORDINATOR) {
      canEditThisSpecificActivity = activityToEdit.level === 'site' && activityToEdit.siteId === currentUser.siteId;
    } else if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
      canEditThisSpecificActivity = activityToEdit.level === 'small_group' && activityToEdit.smallGroupId === currentUser.smallGroupId;
    }
  }

  if (!canEditThisSpecificActivity) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Access Denied" icon={ShieldAlert} />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Unauthorized</CardTitle>
            <CardDescription>You do not have permission to edit this activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              {currentUser?.role === ROLES.SITE_COORDINATOR && "Site Coordinators can only edit site-level activities for their own site."}
              {currentUser?.role === ROLES.SMALL_GROUP_LEADER && "Small Group Leaders can only edit activities specifically for their own small group."}
              {!currentUser && "You must be logged in to edit activities."}
            </p>
            <Button onClick={() => router.push('/dashboard/activities')} className="mt-4">Back to Activities</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }


  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title={`Edit Activity: ${activityToEdit.name}`}
        description="Modify the details of the existing activity."
        icon={Edit}
      />
      <ActivityForm activity={activityToEdit} onSubmitForm={handleUpdateActivity} />
    </RoleBasedGuard>
  );
}
