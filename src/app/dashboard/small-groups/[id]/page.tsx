// src/app/dashboard/small-groups/[id]/page.tsx
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSmallGroupDetails } from '@/hooks/useSmallGroupDetails';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, UsersRound, MapPin, Clock, User, Building, Shield } from 'lucide-react';
import { RoleBasedGuard } from '@/components/shared/RoleBasedGuard';
import { ROLES } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import { PageSkeleton } from '../../../../components/shared/skeletons/PageSkeleton';
import type { User as UserType } from '@/lib/types';

const DetailItem = ({ icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) => (
  <div className="flex items-start space-x-3">
    <div className="flex-shrink-0">
      <div className="h-8 w-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
        {React.createElement(icon, { className: 'h-5 w-5' })}
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value || 'N/A'}</p>
    </div>
  </div>
);

const UserCard = ({ user, role }: { user?: UserType; role: string }) => (
  <div className="flex items-center space-x-4 p-4 border rounded-lg">
    <Avatar className="h-12 w-12">
      <AvatarImage src={user?.profilePicture} />
      <AvatarFallback>{getInitials(user?.name || 'N/A')}</AvatarFallback>
    </Avatar>
    <div>
      <p className="font-bold text-lg">{user?.name || 'Not Assigned'}</p>
      <p className="text-sm text-muted-foreground">{role}</p>
    </div>
  </div>
);

export default function SmallGroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = typeof params.id === 'string' ? params.id : null;
  const { smallGroup, isLoading, error } = useSmallGroupDetails(groupId);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !smallGroup) {
    return (
      <div className="text-center py-10">
        <p className="text-xl font-semibold text-destructive">{error ? error.message : 'Small group not found.'}</p>
        <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const stats = {
    total: smallGroup.members.length,
    male: smallGroup.members.filter(m => m.gender === 'male').length,
    female: smallGroup.members.filter(m => m.gender === 'female').length,
    student: smallGroup.members.filter(m => m.type === 'student').length,
    nonStudent: smallGroup.members.filter(m => m.type === 'non-student').length,
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader
        title={smallGroup.name}
        description={`Details for the small group.`}
        icon={UsersRound}
        actions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/small-groups')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
            <Link href={`/dashboard/sites/${smallGroup.siteId}/small-groups/${smallGroup.id}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" /> Edit Group
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* First Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Group Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <DetailItem icon={Building} label="Site" value={smallGroup.site?.name} />
              <DetailItem icon={MapPin} label="Meeting Location" value={smallGroup.meetingLocation} />
              <DetailItem icon={Clock} label="Meeting Day" value={smallGroup.meetingDay} />
              <DetailItem icon={Clock} label="Meeting Time" value={smallGroup.meetingTime} />
            </CardContent>
          </Card>
        </div>

        {/* Second Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <DetailItem icon={UsersRound} label="Total Members" value={stats.total} />
              <DetailItem icon={User} label="Gender" value={`${stats.male} Male, ${stats.female} Female`} />
              <DetailItem icon={Shield} label="Type" value={`${stats.student} Student, ${stats.nonStudent} Non-student`} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Leadership Team</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <UserCard user={smallGroup.leader} role="Leader" />
          <UserCard user={smallGroup.logisticsAssistant} role="Logistics Assistant" />
          <UserCard user={smallGroup.financeAssistant} role="Finance Assistant" />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Members ({stats.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Join Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {smallGroup.members.length > 0 ? (
                smallGroup.members.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.gender}</TableCell>
                    <TableCell>{member.type}</TableCell>
                    <TableCell>{member.phone || 'N/A'}</TableCell>
                    <TableCell>{member.email || 'N/A'}</TableCell>
                    <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </RoleBasedGuard>
  );
}
