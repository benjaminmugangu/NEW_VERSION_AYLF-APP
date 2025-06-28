// src/app/dashboard/sites/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, PlusCircle, Edit, Trash2, Eye, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockSites, mockSmallGroups, mockMembers } from "@/lib/mockData"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { Site } from "@/lib/types";
import { StatCard } from "@/components/shared/StatCard";

// New component for the analytics part to isolate useEffect
function SitePerformanceAnalytics() {
  const [totalSiteMembers, setTotalSiteMembers] = useState<string | null>(null);
  const [avgActivities, setAvgActivities] = useState<string | null>(null);
  const totalSmallGroupsCount = mockSmallGroups.length; // Not date filtered

  useEffect(() => {
    // These will only run on the client, after initial hydration
    // Calculate total members across all sites using mockMembers for better accuracy
    const totalMembers = mockMembers.filter(member => member.siteId && mockSites.some(site => site.id === member.siteId)).length;
    setTotalSiteMembers(totalMembers.toString());
    setAvgActivities((Math.random() * 50 + 20).toFixed(0)); // Keep average activities as random for now
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
            title="Total Sites" 
            value={mockSites.length} 
            icon={Building} 
            description="Number of operational sites"
        />
        <StatCard 
            title="Total Small Groups" 
            value={totalSmallGroupsCount} 
            icon={UsersRound} 
            description="Across all sites"
            href="/dashboard/sites" // Pointing to sites page for drill-down
        />
        <StatCard 
            title="Total Site Members" 
            value={totalSiteMembers !== null ? totalSiteMembers : <Skeleton className="h-7 w-12 inline-block" />} 
            icon={UsersRound} 
            description="Members affiliated with any site"
            href="/dashboard/members"
        />
        {/* Placeholder for average activities - can be made more dynamic later */}
        {/* <div className="border p-4 rounded-lg bg-secondary/30 text-center">
            {avgActivities !== null ? (
              <h4 className="text-2xl font-bold text-primary">{avgActivities}</h4>
            ) : (
              <Skeleton className="h-7 w-10 mx-auto mb-1" />
            )}
            <p className="text-sm text-muted-foreground">Average Activities per Site (Mock)</p>
        </div> */}
    </div>
  );
}


export default function ManageSitesPage() {
  const [sitesWithCounts, setSitesWithCounts] = useState<Array<Site & { membersCount: number; smallGroupsCount: number }>>([]);

  useEffect(() => {
    setSitesWithCounts(
      mockSites.map(site => ({
        ...site,
        membersCount: mockMembers.filter(member => member.siteId === site.id).length,
        smallGroupsCount: mockSmallGroups.filter(sg => sg.siteId === site.id).length,
      }))
    );
  }, []);
  
  // site.coordinatorId now stores the name directly
  const getCoordinatorName = (coordinatorName?: string) => {
    return coordinatorName || "N/A";
  };
  
  const getCoordinatorInitials = (name: string) => {
    if (!name || name === "N/A") return "N/A";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length -1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="Manage Sites"
        description="Oversee all AYLF operational sites, their coordinators, and performance."
        icon={Building}
        actions={
          <Link href="/dashboard/sites/new" passHref legacyBehavior>
            <Button> 
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Site
            </Button>
          </Link>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All AYLF Sites</CardTitle>
          <CardDescription>List of registered sites and their key information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Coordinator</TableHead>
                  <TableHead>Total Members</TableHead>
                  <TableHead>Active Small Groups</TableHead>
                  <TableHead className="text-right w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sitesWithCounts.length > 0 ? sitesWithCounts.map(site => {
                  const coordinatorDisplayName = getCoordinatorName(site.coordinatorId);
                  return (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {/* Use coordinatorDisplayName for avatar generation if not "N/A" */}
                            <AvatarImage 
                              src={coordinatorDisplayName !== "N/A" ? `https://avatar.vercel.sh/${coordinatorDisplayName.replace(/\s+/g, '')}.png` : undefined} 
                              alt={coordinatorDisplayName} 
                              data-ai-hint="coordinator avatar" />
                            <AvatarFallback>{getCoordinatorInitials(coordinatorDisplayName)}</AvatarFallback>
                          </Avatar>
                          <span>{coordinatorDisplayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{site.membersCount}</TableCell>
                      <TableCell>{site.smallGroupsCount}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Link href={`/dashboard/sites/${site.id}`} passHref legacyBehavior>
                          <Button variant="ghost" size="icon" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/sites/${site.id}/edit`} passHref legacyBehavior>
                          <Button variant="ghost" size="icon" title="Edit Site">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" title="Delete Site (Not Implemented)" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" disabled>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
              }) : (
                  [...Array(5)].map((_, index) => ( 
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
            <SitePerformanceAnalytics />
        </CardContent>
      </Card>
    </RoleBasedGuard>
  );
}

