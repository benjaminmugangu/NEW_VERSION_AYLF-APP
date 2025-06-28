// src/app/dashboard/activities/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { ActivityChart } from "./components/ActivityChart";
import { mockActivities, mockSites, mockSmallGroups } from "@/lib/mockData";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; 
import { Activity as ActivityIcon, ListFilter, Search, Eye, Edit, PlusCircle } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import React, { useState, useMemo } from "react";
import type { Activity } from "@/lib/types";
import { DateRangeFilter, applyDateFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth"; 

export default function ActivitiesPage() {
  const { currentUser } = useAuth(); 
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: "All Time" });

  const baseActivities = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
      return mockActivities;
    }
    if (currentUser.role === ROLES.SITE_COORDINATOR) {
      return mockActivities.filter(
        act => act.siteId === currentUser.siteId || 
               (act.level === 'small_group' && mockSmallGroups.find(sg => sg.id === act.smallGroupId)?.siteId === currentUser.siteId)
      );
    }
    if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
      return mockActivities.filter(act => act.smallGroupId === currentUser.smallGroupId);
    }
    return [];
  }, [currentUser]);

  const availableLevelFilters = useMemo(() => {
    if (currentUser?.role === ROLES.NATIONAL_COORDINATOR) {
      return ["national", "site", "small_group"] as Activity["level"][];
    }
    if (currentUser?.role === ROLES.SITE_COORDINATOR) {
      return ["site", "small_group"] as Activity["level"][];
    }
    if (currentUser?.role === ROLES.SMALL_GROUP_LEADER) {
      return ["small_group"] as Activity["level"][];
    }
    return [] as Activity["level"][];
  }, [currentUser?.role]);

  const initialLevelFilterState = useMemo(() => {
    const state: Record<Activity["level"], boolean> = { national: false, site: false, small_group: false };
    availableLevelFilters.forEach(level => state[level] = true); // Default to true for available levels
    return state;
  }, [availableLevelFilters]);

  const [statusFilter, setStatusFilter] = useState<Record<Activity["status"], boolean>>({
    planned: true,
    executed: true,
    cancelled: true,
  });
  const [levelFilter, setLevelFilter] = useState<Record<Activity["level"], boolean>>(initialLevelFilterState);

  // Update levelFilter if availableLevelFilters change (e.g., on user load)
  React.useEffect(() => {
    setLevelFilter(initialLevelFilterState);
  }, [initialLevelFilterState]);


  const dateFilteredActivities = useMemo(() => {
    return applyDateFilter(baseActivities, dateFilter);
  }, [baseActivities, dateFilter]);

  const fullyFilteredActivities = useMemo(() => {
    return dateFilteredActivities.filter(activity => {
      const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            activity.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter[activity.status];
      const matchesLevel = levelFilter[activity.level]; // This will now correctly only filter among available levels
      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [searchTerm, statusFilter, levelFilter, dateFilteredActivities]);

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

  const canEditActivity = (activity: Activity): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
      return true;
    }
    if (currentUser.role === ROLES.SITE_COORDINATOR) {
      // Site coordinator can edit site-level activities for their own site,
      // OR small group activities within their own site.
      return (activity.level === 'site' && activity.siteId === currentUser.siteId) ||
             (activity.level === 'small_group' && mockSmallGroups.find(sg => sg.id === activity.smallGroupId)?.siteId === currentUser.siteId);
    }
    if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
      return activity.level === 'small_group' && activity.smallGroupId === currentUser.smallGroupId;
    }
    return false;
  };

  const pageDescription = useMemo(() => {
    let contextMessage = `View and manage activities.`;
    if (currentUser?.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
      const siteName = mockSites.find(s => s.id === currentUser.siteId)?.name;
      contextMessage = `Viewing activities for ${siteName || 'your site'}.`;
    } else if (currentUser?.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
      const sgName = mockSmallGroups.find(sg => sg.id === currentUser.smallGroupId)?.name;
      contextMessage = `Viewing activities for ${sgName || 'your small group'}.`;
    }
    return `${contextMessage} Filter: ${dateFilter.display}`;
  }, [currentUser, dateFilter.display]);


  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Activity Management"
        description={pageDescription}
        icon={ActivityIcon}
        actions={
          <Link href="/dashboard/activities/new" passHref legacyBehavior>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Activity
            </Button>
          </Link>
        }
      />
      <div className="mb-6">
        <ActivityChart activities={fullyFilteredActivities} title="Activities Overview by Status" description={`Summary of activities for the selected period based on their status.`} />
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Activities</CardTitle>
          <CardDescription>A comprehensive list of recorded activities. Use filters to narrow down your search.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="relative w-full sm:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <ListFilter className="mr-2 h-4 w-4" /> Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(statusFilter) as Activity["status"][]).map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter[status]}
                    onCheckedChange={(checked) => setStatusFilter(prev => ({...prev, [status]: !!checked}))}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
                {availableLevelFilters.length > 0 && (
                  <>
                    <DropdownMenuLabel>Filter by Level</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableLevelFilters.map(level => (
                      <DropdownMenuCheckboxItem
                        key={level}
                        checked={levelFilter[level]}
                        onCheckedChange={(checked) => setLevelFilter(prev => ({...prev, [level]: !!checked}))}
                      >
                        {level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Participants</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullyFilteredActivities.length > 0 ? fullyFilteredActivities.map(activity => {
                  const isEditable = canEditActivity(activity);
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell>{new Date(activity.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className={`${getLevelBadgeColor(activity.level)} border-none`}>
                          {activity.level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(activity.status)}>
                          {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{activity.participantsCount !== undefined ? activity.participantsCount : "N/A"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Link href={`/dashboard/activities/${activity.id}`} passHref legacyBehavior>
                          <Button variant="ghost" size="icon" title="View Details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {isEditable ? (
                          <Link
                            href={`/dashboard/activities/${activity.id}/edit`}
                            passHref
                            legacyBehavior>
                            <Button variant="ghost" size="icon" title="Edit Activity">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="ghost" size="icon" title="Edit Activity" disabled>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No activities found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </RoleBasedGuard>
  );
}
