// src/app/dashboard/activities/[activityId]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { activityService } from "@/services/activityService";
import { Activity, ActivityStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Layers, Tag, CheckCircle, XCircle, Loader2, Info, FileText, Edit, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activity, setActivity] = React.useState<Activity | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchActivity = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const activityData = await activityService.getActivityById(id);
        setActivity(activityData);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Error" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  if (!activity) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Activity Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The activity you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  const statusConfig: { [key in ActivityStatus]?: { color: string; label: string } } = {
    planned: { color: 'text-blue-500', label: 'Planned' },
    in_progress: { color: 'text-yellow-500', label: 'In Progress' },
    delayed: { color: 'text-orange-500', label: 'Delayed' },
    executed: { color: 'text-green-500', label: 'Executed' },
    canceled: { color: 'text-red-500', label: 'Canceled' },
  };

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

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <PageHeader 
        title={activity.title}
        description={`Details for activity: ${activity.title}`}
        icon={Tag}
        actions={
          <Link href={`/dashboard/activities/${id}/edit`}>
            <Button variant="outline"><Edit className="mr-2 h-4 w-4"/> Edit Activity</Button>
          </Link>
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

              {activity.level === 'site' && activity.site_id && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Site</h3>
                  <p className="text-foreground">{activity.siteName || 'N/A'}</p>
                </div>
              )}
              {activity.level === 'small_group' && activity.small_group_id && (
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
           {/* TODO: Implement a proper way to fetch and display related reports */}
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
    </RoleBasedGuard>
  );
}
