// src/app/dashboard/users/[userId]/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import type { User } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User as UserIcon, Mail, Briefcase, Building, Users, Calendar, CheckCircle, XCircle, Info } from 'lucide-react';
import { UserDetailSkeleton } from '@/components/shared/skeletons/UserDetailSkeleton';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { user, isLoading, isError } = useUser(userId);

  if (isLoading) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <PageHeader title="Loading User..." icon={UserIcon} />
        <UserDetailSkeleton />
      </RoleBasedGuard>
    );
  }

  if (isError) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <PageHeader title="User Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The user you are looking for does not exist or an error occurred.</p>
            <Button onClick={() => router.push('/dashboard/users')} className="mt-4">Go to Users List</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  if (!user) { // This will be true only after isError check and if user is null for other reasons

    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <PageHeader title="User Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The user you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  const getStatusBadgeVariant = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'default' : 'destructive';
  };

  const getStatusIcon = (status: 'active' | 'inactive') => {
    return status === 'active' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <PageHeader 
        title={user.name} 
        icon={UserIcon}
        description={`Details for user: ${user.name}`}
        actions={
            <Link href={`/dashboard/users/${user.id}/edit`}>
                <Button variant="outline">Edit User</Button>
            </Link>
        }
      />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>General details and role assignment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Mail className="h-5 w-5 mr-3 text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center">
              <Briefcase className="h-5 w-5 mr-3 text-muted-foreground" />
              <span className="text-foreground capitalize">{user.role.replace(/_/g, ' ')}</span>
            </div>
            {user.status && (
              <div className="flex items-center">
                  {getStatusIcon(user.status)}
                  <Badge variant={getStatusBadgeVariant(user.status)} className="ml-2">{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</Badge>
              </div>
            )}
            {user.siteId && (
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-3 text-muted-foreground" />
                <Link href={`/dashboard/sites/${user.siteId}`} className="text-primary hover:underline">
                  Site: {user.siteName}
                </Link>
              </div>
            )}
            {user.smallGroupId && (
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-3 text-muted-foreground" />
                <Link href={`/dashboard/small-groups/${user.smallGroupId}`} className="text-primary hover:underline">
                  Small Group: {user.smallGroupName}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Mandate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {user.mandateStartDate && (
                    <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
                        <div>
                            <p className="font-medium">Start Date</p>
                            <p className="text-muted-foreground">{new Date(user.mandateStartDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}
                {user.mandateEndDate && (
                    <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
                        <div>
                            <p className="font-medium">End Date</p>
                            <p className="text-muted-foreground">{new Date(user.mandateEndDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
      <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
    </RoleBasedGuard>
  );
}
