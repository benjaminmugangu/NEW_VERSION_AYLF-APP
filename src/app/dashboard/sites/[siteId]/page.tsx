// src/app/dashboard/sites/[siteId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { mockSites, mockSmallGroups, mockUsers, mockMembers } from "@/lib/mockData";
import type { Site, SmallGroup as SmallGroupType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, Users, UserCircle, Eye, Info, Edit, Trash2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth"; 

interface SmallGroupWithCounts extends SmallGroupType {
  membersCount: number;
}

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const { currentUser } = useAuth(); 

  const [site, setSite] = useState<Site | null>(null);
  const [smallGroups, setSmallGroups] = useState<SmallGroupWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSiteMembersCount, setTotalSiteMembersCount] = useState(0);

  useEffect(() => {
    const foundSite = mockSites.find(s => s.id === siteId);
    if (foundSite) {
      setSite(foundSite);
      const siteSmallGroups = mockSmallGroups
        .filter(sg => sg.siteId === siteId)
        .map(sg => ({
          ...sg,
          membersCount: mockMembers.filter(mem => mem.smallGroupId === sg.id).length,
        }));
      setSmallGroups(siteSmallGroups);

      const membersForThisSite = mockMembers.filter(mem => mem.siteId === siteId).length;
      setTotalSiteMembersCount(membersForThisSite);
    }
    setIsLoading(false);
  }, [siteId]);

  const getLeaderName = (leaderId?: string) => {
    if (!leaderId) return "N/A";
    // Small Group leaderId is still a User ID
    const leader = mockUsers.find(user => user.id === leaderId);
    return leader ? leader.name : "N/A";
  };

  const getLeaderInitials = (name: string) => {
    if (!name || name === "N/A") return "N/A";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length -1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <PageHeader title="Loading Site Details..." icon={Building} />
        <Card>
          <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  if (!site) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <PageHeader title="Site Not Found" icon={Info} />
        <Card>
          <CardContent className="pt-6">
            <p>The site you are looking for does not exist or could not be found.</p>
            <Button onClick={() => router.push('/dashboard/sites')} className="mt-4">Back to Sites</Button>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }
  
  const siteCoordinatorName = site.coordinatorId; 
  const canManageSite = currentUser?.role === ROLES.NATIONAL_COORDINATOR;
  // Site coordinators can no longer manage (add/edit/delete) small groups. Only National Coordinators.
  const canManageSmallGroups = currentUser?.role === ROLES.NATIONAL_COORDINATOR;


  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <PageHeader 
        title={site.name} 
        description={`Details for site: ${site.name}`} 
        icon={Building}
        actions={
          canManageSite ? (
             <div className="flex gap-2">
              <Link href={`/dashboard/sites/${site.id}/edit`} passHref legacyBehavior>
                <Button variant="outline"> 
                  <Edit className="mr-2 h-4 w-4" /> Edit Site
                </Button>
              </Link>
              <Button variant="destructive" disabled>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Site
              </Button>
            </div>
          ) : null
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Site Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center">
              <UserCircle className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-muted-foreground">Coordinator</span>
                <p className="text-foreground">{siteCoordinatorName || "N/A"}</p>
              </div>
            </div>
             <div className="flex items-center">
              <Users className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-muted-foreground">Total Small Groups</span>
                <p className="text-foreground">{smallGroups.length}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Users className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-muted-foreground">Total Members</span>
                <p className="text-foreground">{totalSiteMembersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Quick Stats (Illustrative)</CardTitle>
            <CardDescription>Key metrics for this site.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{Math.floor(Math.random() * 20) + 5}</p>
              <p className="text-sm text-muted-foreground">Activities Last Month</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{Math.floor(Math.random() * 10) + 2}%</p>
              <p className="text-sm text-muted-foreground">Member Growth (QTD)</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Small Groups in {site.name}</CardTitle>
            <CardDescription>List of small groups operating under this site.</CardDescription>
          </div>
          {canManageSmallGroups && ( // Only National Coordinator can add new Small Groups
            // TODO: Link to /dashboard/sites/[siteId]/small-groups/new when form is created
            (<Button variant="outline" disabled>
              <PlusCircle className="mr-2 h-4 w-4"/>Add Small Group
                          </Button>)
          )}
        </CardHeader>
        <CardContent>
          {smallGroups.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Small Group Name</TableHead>
                    <TableHead>Leader</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {smallGroups.map(sg => (
                    <TableRow key={sg.id}>
                      <TableCell className="font-medium">{sg.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://avatar.vercel.sh/${getLeaderName(sg.leaderId)}.png`} alt={getLeaderName(sg.leaderId)} data-ai-hint="leader avatar"/>
                            <AvatarFallback>{getLeaderInitials(getLeaderName(sg.leaderId))}</AvatarFallback>
                          </Avatar>
                          <span>{getLeaderName(sg.leaderId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{sg.membersCount}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {/* Future: Link to small group detail page */}
                        <Button variant="ghost" size="icon" title="View Small Group Details (Future)" disabled>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManageSmallGroups && ( // Only National Coordinator can edit/delete
                          (<>
                            <Link
                              href={`/dashboard/sites/${siteId}/small-groups/${sg.id}/edit`}
                              passHref
                              legacyBehavior>
                              <Button variant="ghost" size="icon" title="Edit Small Group">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" title="Delete Small Group (Future)" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" disabled>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No small groups found for this site.</p>
          )}
        </CardContent>
      </Card>
      <Button onClick={() => router.push('/dashboard/sites')} className="mt-6">Back to Sites List</Button>
    </RoleBasedGuard>
  );
}
