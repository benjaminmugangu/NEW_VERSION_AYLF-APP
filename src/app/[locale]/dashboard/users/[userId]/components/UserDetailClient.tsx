// src/app/dashboard/users/[userId]/components/UserDetailClient.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User as UserIcon, Mail, Briefcase, Building, Users, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface UserDetailClientProps {
  readonly user: User;
  readonly canEdit: boolean;
}

export function UserDetailClient({ user, canEdit }: UserDetailClientProps) {
  const router = useRouter();

  const getStatusBadgeVariant = (status?: 'active' | 'inactive' | 'invited') => {
    if (status === 'active') return 'default';
    if (status === 'invited') return 'secondary';
    return 'destructive';
  };

  const getStatusIcon = (status?: 'active' | 'inactive' | 'invited') => {
    if (!status) return null;
    if (status === 'active') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'invited') return <Mail className="h-4 w-4 text-blue-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <>
      <PageHeader
        title={user.name}
        icon={UserIcon}
        description={`Details for user: ${user.name}`}
        actions={
          canEdit ? (
            <Link href={`/dashboard/users/${user.id}/edit`}>
              <Button variant="outline">Edit User</Button>
            </Link>
          ) : null
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
              <span className="text-foreground capitalize">{user.role.replaceAll('_', ' ')}</span>
            </div>
            {user.status && (
              <div className="flex items-center">
                {getStatusIcon(user.status)}
                <Badge variant={getStatusBadgeVariant(user.status)} className="ml-2">
                  {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Unknown'}
                </Badge>
              </div>
            )}
            {user.siteId && user.siteName && (
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-3 text-muted-foreground" />
                <Link href={`/dashboard/sites/${user.siteId}`} className="text-primary hover:underline">
                  Site: {user.siteName}
                </Link>
              </div>
            )}
            {user.smallGroupId && user.smallGroupName && (
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
            {user.mandateStartDate ? (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
                <div>
                  <p className="font-medium">Start Date</p>
                  <p className="text-muted-foreground">{new Date(user.mandateStartDate).toLocaleDateString()}</p>
                </div>
              </div>
            ) : <p className="text-muted-foreground">No start date set.</p>}
            {user.mandateEndDate ? (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
                <div>
                  <p className="font-medium">End Date</p>
                  <p className="text-muted-foreground">{new Date(user.mandateEndDate).toLocaleDateString()}</p>
                </div>
              </div>
            ) : <p className="text-muted-foreground">No end date set.</p>}
          </CardContent>
        </Card>
      </div>
      <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
    </>
  );
}