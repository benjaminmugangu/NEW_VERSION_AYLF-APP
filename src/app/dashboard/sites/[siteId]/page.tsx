// src/app/dashboard/sites/[siteId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import siteService from '@/services/siteService';
import smallGroupService from '@/services/smallGroupService';
import { profileService } from '@/services/profileService';
import type { Site, SmallGroup as SmallGroupType, User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, Users, Eye, Edit, Trash2, PlusCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { SiteDetailSkeleton } from "@/components/shared/skeletons/SiteDetailSkeleton"; 
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; 

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
  const [leadersMap, setLeadersMap] = useState<Record<string, User>>({});
  const { toast } = useToast();
  const [groupToDelete, setGroupToDelete] = useState<SmallGroupWithCounts | null>(null);

  useEffect(() => {
    if (!siteId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Step 1: Fetch all site details, including small groups with counts
        const detailsResponse = await siteService.getSiteDetails(siteId);
        if (!detailsResponse.success || !detailsResponse.data) {
          throw new Error(detailsResponse.error?.message || 'Failed to fetch site details.');
        }

        const { site, smallGroups, totalMembers } = detailsResponse.data;

        setSite(site);
        setSmallGroups(smallGroups); // This data now includes membersCount
        setTotalSiteMembersCount(totalMembers);

        // Step 2: Fetch leaders for these small groups
        const leaderIds = [...new Set(smallGroups.map((sg) => sg.leaderId).filter((id): id is string => !!id))];
        if (leaderIds.length > 0) {
          const leadersResponse = await profileService.getUsersByIds(leaderIds);
          if (leadersResponse.success && leadersResponse.data) {
            const newLeadersMap = leadersResponse.data.reduce((acc: Record<string, User>, user) => {
              acc[user.id] = user;
              return acc;
            }, {});
            setLeadersMap(newLeadersMap);
          }
        }

      } catch (error) {
        const err = error as Error;
        setSite(null);
        toast({
          title: "Error Fetching Site Data",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [siteId, toast]);

  const handleDeleteSmallGroup = async () => {
    if (!groupToDelete) return;
    const result = await smallGroupService.deleteSmallGroup(groupToDelete.id);
    if (result.success) {
      toast({ title: "Small Group Deleted!", description: `The group "${groupToDelete.name}" has been successfully deleted.` });
      setSmallGroups(prev => prev.filter(g => g.id !== groupToDelete.id));
    } else {
      toast({ title: "Error Deleting Group", description: result.error?.message || "An unknown error occurred.", variant: "destructive" });
    }
    setGroupToDelete(null);
  };

  const getLeaderName = (leaderId?: string) => {
    return leaderId ? leadersMap[leaderId]?.name || 'N/A' : 'N/A';
  };

  const getLeaderInitials = (name: string) => {
    if (!name || name === 'N/A') return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return <SiteDetailSkeleton />;
  }

  if (!site) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
        <PageHeader title="Site Not Found" description="The requested site could not be found." icon={Info} />
        <Button onClick={() => router.push('/dashboard/sites')}>Back to Sites List</Button>
      </RoleBasedGuard>
    );
  }

  const canManageSmallGroups = currentUser?.role === ROLES.NATIONAL_COORDINATOR;

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR]}>
      <PageHeader 
        title={site.name} 
        description={`Details for site: ${site.name}`} 
        icon={Building}
        actions={
          currentUser?.role === ROLES.NATIONAL_COORDINATOR ? (
            <div className="flex items-center space-x-2">
              <Link href={`/dashboard/sites/${siteId}/edit`}>
                <Button variant="outline"><Edit className="mr-2 h-4 w-4" /> Edit Site</Button>
              </Link>
              <Button variant="destructive" disabled><Trash2 className="mr-2 h-4 w-4" /> Delete Site</Button>
            </div>
          ) : null
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader><CardTitle>Site Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-muted-foreground">Coordinator</span>
                <p className="text-foreground">{site.coordinator?.name || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Building className="h-5 w-5 mr-3 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-muted-foreground">Location</span>
                <p className="text-foreground">{site.city}, {site.country}</p>
              </div>
            </div>
             <div className="flex items-center">
              <Users className="h-5 w-5 mr-3 text-muted-foreground" />
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
          <CardContent className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{smallGroups.length}</p>
              <p className="text-sm text-muted-foreground">Small Groups</p>
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
            <CardDescription>List of all small groups within this site.</CardDescription>
          </div>
          {canManageSmallGroups && (
            <Link href={`/dashboard/sites/${siteId}/small-groups/new`}>
              <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" />Add Small Group</Button>
            </Link>
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
                        <Button variant="ghost" size="icon" title="View Small Group Details (Future)" disabled><Eye className="h-4 w-4" /></Button>
                        {canManageSmallGroups && (
                          <>
                            <Link href={`/dashboard/sites/${siteId}/small-groups/${sg.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Edit Small Group"><Edit className="h-4 w-4" /></Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Small Group"
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              onClick={() => setGroupToDelete(sg)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
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
      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the small group <span className="font-semibold">{groupToDelete?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSmallGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleBasedGuard>
  );
}
