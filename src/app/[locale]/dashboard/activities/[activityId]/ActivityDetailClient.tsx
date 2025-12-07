"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { ROLES } from '@/lib/constants';
import type { Activity, ActivityStatus, UserRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Layers, Tag, CheckCircle, XCircle, Loader2, Info, FileText, Edit, AlertTriangle } from 'lucide-react';

interface ActivityDetailClientProps {
  activity: Activity;
  userRole: UserRole;
}

export default function ActivityDetailClient({ activity, userRole }: ActivityDetailClientProps) {
  const router = useRouter();
  const id = activity.id;

  const getStatusIcon = (status: Activity["status"]) => {
    switch (status) {
      case "executed": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "planned": return <CalendarDays className="h-5 w-5 text-blue-500" />;
      case "in_progress": return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      case "delayed": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "canceled": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusBadgeVariant = (status: Activity["status"]) => {
    const statusVariantMap: { [key in ActivityStatus]?: "success" | "default" | "secondary" | "destructive" | "outline" } = {
      executed: 'success',
      canceled: 'destructive',
      delayed: 'destructive',
      in_progress: 'default',
      planned: 'secondary',
    };
    return statusVariantMap[status] || "default";
  };

  const getLevelBadgeColor = (level: Activity["level"]) => {
    switch(level) {
      case "national": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "site": return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      case "small_group": return "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const canEdit = [
    ROLES.NATIONAL_COORDINATOR,
    ROLES.SITE_COORDINATOR,
    ROLES.SMALL_GROUP_LEADER
  ].includes(userRole);

  return (
    <>
      <PageHeader 
        title={activity.title}
        description={`Details for activity: ${activity.title}`}
        icon={Tag}
        actions={
          canEdit ? (
            <Link href={`/dashboard/activities/${id}/edit`}>
              <Button variant="outline"><Edit className="mr-2 h-4 w-4"/> Edit Activity</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Activity Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Thematic</h3>
                <p className="text-foreground whitespace-pre-wrap">{activity.thematic}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center"><CalendarDays className="mr-2 h-4 w-4" /> Date</h3>
                  <p className="text-foreground">{new Date(activity.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Layers className="mr-2 h-4 w-4" /> Level</h3>
                  <Badge variant="outline" className={`${getLevelBadgeColor(activity.level)} border-none`}>
                    {activity.level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center">Status</h3>
                  <Badge variant={getStatusBadgeVariant(activity.status)} className="flex items-center gap-1.5">
                    {getStatusIcon(activity.status)}
                    {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                  </Badge>
                </div>
                {activity.participantsCount !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4" /> Participants</h3>
                    <p className="text-foreground">{activity.participantsCount}</p>
                  </div>
                )}
              </div>

              {activity.level === 'site' && activity.siteId && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Site</h3>
                  <p className="text-foreground">{activity.siteName || 'N/A'}</p>
                </div>
              )}
              {activity.level === 'small_group' && activity.smallGroupId && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Small Group</h3>
                  <p className="text-foreground">{activity.smallGroupName || 'N/A'} (Site: {activity.siteName || 'N/A'})</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Participants (Illustrative)</CardTitle>
               <CardDescription>A list of individuals who attended or are planned for this activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {activity.participantsCount && activity.participantsCount > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {Array.from({ length: Math.min(activity.participantsCount || 0, 5) }).map((_, i) => ( 
                    <li key={i}>Participant #{i + 1} (Mock Name)</li>
                  ))}
                  {(activity.participantsCount || 0) > 5 && <li>And {(activity.participantsCount || 0) - 5} more...</li>}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No participant information available or planned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" /> Related Reports</CardTitle>
              <CardDescription>Reports associated with this activity.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Feature to link reports is coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
    </>
  );
}
