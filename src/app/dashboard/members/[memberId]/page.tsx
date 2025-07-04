// src/app/dashboard/members/[memberId]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockMembers, mockSites, mockSmallGroups, mockActivities } from "@/lib/mockData"; 
import type { Member } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, CalendarDays, Users as UsersIcon, University, Mail, Phone, Activity as ActivityIcon, Link as LinkIcon, Info, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;

  const member = mockMembers.find(mem => mem.id === memberId);

  const getSiteName = (siteId?: string) : string => siteId ? mockSites.find(s => s.id === siteId)?.name || "N/A" : "N/A";
  const getSmallGroupName = (smallGroupId?: string): string => {
    if (!smallGroupId) return "N/A";
    const sg = mockSmallGroups.find(s => s.id === smallGroupId);
    return sg ? sg.name : "N/A";
  };
  
  const getInitials = (name: string = "") => {
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length -1]) { // Check if names[0] and names[names.length -1] exist
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Mock related data - for illustration
  const relatedActivities = mockActivities.filter(activity => 
    (activity.level === "small_group" && activity.smallGroupId === member?.smallGroupId) ||
    (activity.level === "site" && activity.siteId === member?.siteId) ||
    activity.level === "national" // All members can potentially attend national activities
  ).slice(0, 3); // Show a few


  if (!member) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Member Not Found" icon={Info} />
         <Card>
          <CardContent className="pt-6">
            <p>The member you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title={member.name} 
        description={`Profile for member: ${member.name}`} 
        icon={User}
        actions={
           <Link href={`/dashboard/members/${member.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Member
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4 border-2 border-primary">
                <AvatarImage src={`https://avatar.vercel.sh/${member.name.split(' ').join('')}.png`} alt={member.name} data-ai-hint="member avatar" />
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{member.name}</CardTitle>
              <Badge variant={member.type === "student" ? "default" : "secondary"} className="mt-1">
                {member.type.charAt(0).toUpperCase() + member.type.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex items-center">
                <Mail className="mr-3 h-4 w-4 text-muted-foreground" />
                <span>{member.name.toLowerCase().split(' ').join('.')}@aylf.example.org (Mock)</span>
              </div>
              <div className="flex items-center">
                <Phone className="mr-3 h-4 w-4 text-muted-foreground" />
                <span>+243 XXX XXX XXX (Mock)</span>
              </div>
              <div className="flex items-center">
                <CalendarDays className="mr-3 h-4 w-4 text-muted-foreground" />
                <span>Joined: {new Date(member.joinDate).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Affiliation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {member.siteId && (
                <div className="flex items-start">
                  <University className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Site</span>
                    <p className="text-foreground">{getSiteName(member.siteId)}</p>
                  </div>
                </div>
              )}
              {member.smallGroupId && (
                <div className="flex items-start">
                  <UsersIcon className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Small Group</span>
                    <p className="text-foreground">{getSmallGroupName(member.smallGroupId)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><ActivityIcon className="mr-2 h-5 w-5 text-primary"/> Recent Activity Involvement (Illustrative)</CardTitle>
              <CardDescription>Activities this member might have been involved in.</CardDescription>
            </CardHeader>
            <CardContent>
              {relatedActivities.length > 0 ? (
                <ul className="space-y-3">
                  {relatedActivities.map(activity => (
                    <li key={activity.id} className="text-sm border-b pb-2 last:border-b-0 last:pb-0">
                       <Link href={`/dashboard/activities/${activity.id}`}>
                         <Button variant="link" className="p-0 h-auto font-medium text-primary hover:underline flex items-center">
                            {activity.name} <LinkIcon className="ml-1 h-3 w-3"/>
                         </Button>
                       </Link>
                       <p className="text-xs text-muted-foreground mt-0.5">{activity.level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - {new Date(activity.date).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity involvement found.</p>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
      <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
    </RoleBasedGuard>
  );
}
