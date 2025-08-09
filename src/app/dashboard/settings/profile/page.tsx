// src/app/dashboard/settings/profile/page.tsx
"use client";

import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileForm } from "./components/ProfileForm";
import { Card, CardContent } from "@/components/ui/card";
import { UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSettingsPage() {
  const { currentUser, updateUserProfile, isLoading } = useAuth();

  if (isLoading || !currentUser) {
    return (
      <div>
        <PageHeader title="My Profile" icon={UserCircle} />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-10 w-1/3 mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // National coordinators can view their profile but might have different editing capabilities elsewhere (e.g. user management page)
  // Site and SG leaders can edit their profiles here.
  const canEdit = currentUser.role === ROLES.SITE_COORDINATOR || currentUser.role === ROLES.SMALL_GROUP_LEADER || currentUser.role === ROLES.NATIONAL_COORDINATOR;

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="My Profile" 
        description="View and update your personal information." 
        icon={UserCircle} 
      />
      <ProfileForm 
        currentUser={currentUser} 
        onUpdateProfile={updateUserProfile}
        canEdit={canEdit}
      />
    </RoleBasedGuard>
  );
}
