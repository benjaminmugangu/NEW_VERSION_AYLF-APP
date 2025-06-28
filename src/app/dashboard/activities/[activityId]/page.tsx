// src/app/dashboard/activities/[activityId]/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image"; // Import next/image
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockActivities, mockSites, mockSmallGroups, mockReports } from "@/lib/mockData";
import type { Activity } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, Layers, Tag, CheckCircle, XCircle, Loader2, Info, FileText, Link as LinkIcon, Image as ImageIcon, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.activityId as string;

  const activity = mockActivities.find(act => act.id === activityId);

  const getSiteName = (siteId?: string) => siteId ? mockSites.find(s => s.id === siteId)?.name || "N/A" : "N/A";
  const getSmallGroupName = (smallGroupId?: string) => smallGroupId ? mockSmallGroups.find(sg => sg.id === smallGroupId)?.name || "N/A" : "N/A";

  const relatedReports = mockReports.filter(report =>
    (activity?.level === "national" && report.level === "national" && report.title.toLowerCase().includes(activity.name.toLowerCase().substring(0,10))) || 
    (activity?.level === "site" && report.siteId === activity.siteId && report.title.toLowerCase().includes(activity.name.toLowerCase().substring(0,10))) ||
    (activity?.level === "small_group" && report.smallGroupId === activity.smallGroupId && report.title.toLowerCase().includes(activity.name.toLowerCase().substring(0,10)))
  );


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

  const getStatusIcon = (status: Activity["status"]) => {
    switch (status) {
      case "executed": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "planned": return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "cancelled": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getStatusBadgeVariant = (status: Activity["status"]) => {
    switch (status) {
      case "executed": return "default"; 
      case "planned": return "secondary"; 
      case "cancelled": return "destructive"; 
      default: return "outline";
    }
  };

  const getLevelBadgeColor = (level: Activity["level"]) => {
    switch(level) {
      case "national": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "site": return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      case "small_group": return "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title={activity.name} 
        description={`Details for activity: ${activity.name}`} 
        icon={Tag}
        actions={
          <Link href={`/dashboard/activities/${activity.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Activity
            </Button>
          </Link>
        }
      />

      {activity.imageUrl && (
        <Card className="mb-6 shadow-lg overflow-hidden">
          <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] md:aspect-[2.5/1] lg:aspect-[3/1]">
            <Image 
              src={activity.imageUrl} 
              alt={activity.name} 
              layout="fill" 
              objectFit="cover"
              data-ai-hint="activity banner image" 
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Activity Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-foreground">{activity.description}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <p className="text-foreground">{getSiteName(activity.siteId)}</p>
                </div>
              )}
              {activity.level === 'small_group' && activity.smallGroupId && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Small Group</h3>
                  <p className="text-foreground">{getSmallGroupName(activity.smallGroupId)} (Site: {getSiteName(mockSmallGroups.find(sg => sg.id === activity.smallGroupId)?.siteId)})</p>
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

        <div className="md:col-span-1 space-y-6">
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" /> Related Reports</CardTitle>
              <CardDescription>Reports associated with this activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {relatedReports.length > 0 ? (
                <ul className="space-y-3">
                  {relatedReports.map(report => (
                    <li key={report.id} className="text-sm border-b pb-2 last:border-b-0 last:pb-0">
                      <Link href={`/dashboard/reports/view#${report.id}`}>
                        <Button variant="link" className="p-0 h-auto font-medium text-primary hover:underline flex items-center">
                           {report.title} <LinkIcon className="ml-1 h-3 w-3"/>
                        </Button>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">Submitted: {new Date(report.submissionDate).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No specific reports found for this activity.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
    </RoleBasedGuard>
  );
}
