// src/app/dashboard/settings/profile/page.tsx
"use client";

import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ROLES } from "@/lib/constants";
import { useCurrentUser } from "@/contexts/AuthContext";
import { ProfileForm } from "./components/ProfileForm";
import { Card, CardContent } from "@/components/ui/card";
import { UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from 'next-intl';

export default function ProfileSettingsPage() {
  const t = useTranslations('Profile');
  const { currentUser, isLoading } = useCurrentUser();

  if (isLoading) {
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

  const { authError } = useCurrentUser();

  if (!currentUser) {
    return (
      <div>
        <PageHeader title="Profile Error" icon={UserCircle} />
        <Card>
          <CardContent>
            <p className="text-destructive font-semibold">User not found. Please log in again.</p>
            <div className="mt-4 p-2 bg-muted rounded text-xs overflow-auto">
              <p>Debug Info:</p>
              <div className="mb-2">
                <strong>Auth Error:</strong>
                <pre className="text-red-500">{JSON.stringify(authError, null, 2)}</pre>
              </div>
              <p>State:</p>
              <pre>{JSON.stringify({ isLoading, hasUser: !!currentUser }, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // National coordinators can view their profile but might have different editing capabilities elsewhere (e.g. user management page)
  // Site and SG leaders can edit their profiles here.
  const canEdit = currentUser.role === ROLES.SITE_COORDINATOR || currentUser.role === ROLES.SMALL_GROUP_LEADER || currentUser.role === ROLES.NATIONAL_COORDINATOR;



  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        icon={UserCircle}
      />
      <ProfileForm
        canEdit={canEdit}
      />
    </>
  );
}
