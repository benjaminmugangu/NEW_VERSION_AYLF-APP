// src/app/dashboard/sites/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, PlusCircle, Edit, Trash2, Eye, UsersRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableRowSkeleton } from "@/components/shared/skeletons/TableRowSkeleton";
import { useSites } from "@/hooks/useSites";
import type { SiteWithDetails } from "@/lib/types";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardSkeleton } from "@/components/shared/skeletons/StatCardSkeleton";
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
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";

export default function ManageSitesPage() {
    const { sites, allSites, isLoading, error, deleteSite, isDeleting, searchTerm, setSearchTerm, canCreateSite, canEditSite, canDeleteSite } = useSites();
  const { toast } = useToast();
  const [siteToDelete, setSiteToDelete] = useState<SiteWithDetails | null>(null);

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;
    try {
      await deleteSite(siteToDelete.id);
    } finally {
      setSiteToDelete(null);
    }
  };

  const analytics = useMemo(() => {
    if (isLoading || error) {
      return { totalSites: 0, totalSmallGroups: 0, totalMembers: 0 };
    }
    return {
      totalSites: allSites.length,
      totalSmallGroups: allSites.reduce((acc, site) => acc + site.smallGroupsCount, 0),
      totalMembers: allSites.reduce((acc, site) => acc + site.membersCount, 0),
    };
  }, [allSites, isLoading, error]);

  React.useEffect(() => {
    if (error) {
      const description = typeof error === 'string' ? error : (error as { message: string }).message;
      toast({ title: "Error", description: description, variant: "destructive" });
    }
  }, [error, toast]);

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Manage Sites"
        description="Oversee all AYLF operational sites, their coordinators, and performance."
        icon={Building}
        actions={
          canCreateSite && (
            <Link href="/dashboard/sites/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Site
              </Button>
            </Link>
          )
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All AYLF Sites</CardTitle>
          <CardDescription>List of registered sites and their key information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by site name..."
                className="pl-8 w-full max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead>Total Members</TableHead>
                  <TableHead>Total Small Groups</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRowSkeleton 
                    rowCount={3}
                    colSpan={5} 
                    cellWidths={['w-1/3', 'w-1/4', 'w-1/6', 'w-1/6', 'w-[120px]']}
                  />
                ) : sites.length > 0 ? (
                  sites.map(site => {
                    const coordinatorName = site.coordinator?.name || "N/A";
                    return (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={site.coordinator?.profilePicture} />
                              <AvatarFallback>{getInitials(coordinatorName)}</AvatarFallback>
                            </Avatar>
                            <span>{coordinatorName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{site.membersCount}</TableCell>
                        <TableCell>{site.smallGroupsCount}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Link href={`/dashboard/sites/${site.id}`}>
                            <Button variant="ghost" size="icon" title="View Details"><Eye className="h-4 w-4" /></Button>
                          </Link>
                          {canEditSite && (
                            <Link href={`/dashboard/sites/${site.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Edit Site"><Edit className="h-4 w-4" /></Button>
                            </Link>
                          )}
                          {canDeleteSite && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Delete Site" 
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              onClick={() => setSiteToDelete(site)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {searchTerm ? `No sites found for "${searchTerm}".` : "No sites found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-8 shadow-lg">
        <CardHeader>
            <CardTitle>Overall Site Analytics</CardTitle>
            <CardDescription>Key metrics for site engagement, growth, and activity levels across the network.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard 
                title="Total Sites" 
                value={analytics.totalSites} 
                icon={Building} 
                description="Number of operational sites"
              />
              <StatCard 
                title="Total Small Groups" 
                value={analytics.totalSmallGroups} 
                icon={UsersRound} 
                description="Across all sites"
              />
              <StatCard 
                title="Total Site Members" 
                value={analytics.totalMembers} 
                icon={UsersRound} 
                description="Members affiliated with any site"
                href="/dashboard/members"
              />
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!siteToDelete} onOpenChange={(open) => !open && setSiteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the site
              <span className="font-semibold"> {siteToDelete?.name}</span> and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSite}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleBasedGuard>
  );
}

