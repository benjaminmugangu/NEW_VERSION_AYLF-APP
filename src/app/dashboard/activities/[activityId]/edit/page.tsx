// src/app/dashboard/activities/[activityId]/edit/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityForm } from "../../components/ActivityForm";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import activityService from "@/services/activityService";
import type { Activity, ActivityFormData } from "@/lib/types";
import { Edit, Info, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoading: authIsLoading } = useAuth();
  const activityId = params.activityId as string;

  const [activityToEdit, setActivityToEdit] = useState<Activity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setError("Activity ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const result = await activityService.getActivityById(activityId);
        if (result.success && result.data) {
          setActivityToEdit(result.data);
        } else {
          setError(result.error?.message || "Activity not found.");
        }
      } catch (err) {
        console.error("Fetch activity error:", err);
        setError("An unexpected error occurred while fetching the activity.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [activityId]);

  const handleUpdateActivity = async (data: ActivityFormData) => {
    const result = await activityService.updateActivity(activityId, data);

    if (result.success && result.data) {
      toast({
        title: "Activity Updated!",
        description: `Activity "${result.data.name}" has been successfully updated.`,
      });
      router.push(`/dashboard/activities/${activityId}`);
    } else {
      toast({
        title: "Error Updating Activity",
        description: result.error?.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  if (authIsLoading || isLoading) {
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

  if (error || !activityToEdit) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Activity Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>{error || "The activity you are looking for does not exist or could not be found."}</p>
            <Button onClick={() => router.push('/dashboard/activities')} className="mt-4">Back to Activities</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  let canEditThisSpecificActivity = false;
  if (currentUser && activityToEdit) {
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
      canEditThisSpecificActivity = true;
    } else if (currentUser.role === ROLES.SITE_COORDINATOR) {
      // A Site Coordinator can edit site-level activities and small-group activities within their site.
      if (activityToEdit.level === 'site' && activityToEdit.siteId === currentUser.siteId) {
          canEditThisSpecificActivity = true;
      } else if (activityToEdit.level === 'small_group') {
          // We need to check if the small group belongs to the site coordinator's site.
          // This logic requires access to small groups data, which should ideally be handled by the service or passed down.
          // For now, we'll stick to the original logic for simplicity, assuming `activityToEdit.siteId` is available for SG activities.
          canEditThisSpecificActivity = activityToEdit.siteId === currentUser.siteId;
      }
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
              {currentUser?.role === ROLES.SITE_COORDINATOR && "Site Coordinators can only edit activities within their own site."}
              {currentUser?.role === ROLES.SMALL_GROUP_LEADER && "Small Group Leaders can only edit activities for their own small group."}
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
