// src/app/dashboard/activities/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Activity as ActivityIcon, ListFilter, Search, Eye, Edit, PlusCircle } from "lucide-react";
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { ActivityChart } from "./components/ActivityChart";
import { useActivities } from "@/hooks/useActivities";
import { ActivitiesPageSkeleton } from "@/components/shared/skeletons/ActivitiesPageSkeleton";
import { ROLES } from "@/lib/constants";
import type { Activity } from "@/lib/types";

export default function ActivitiesPage() {
  const {
    activities,
    isLoading,
    error,
    filters,
    setSearchTerm,
    setDateFilter,
    setStatusFilter,
    setLevelFilter,
    refetch,
    availableLevelFilters,
    canEditActivity,
  } = useActivities();

  // Helper functions for UI rendering
  const getStatusBadgeVariant = (status: Activity["status"]) => {
    const variants: Record<Activity["status"], "success" | "default" | "destructive"> = {
      executed: "success",
      planned: "default",
      cancelled: "destructive",
    };
    return variants[status] || "secondary";
  };

  const getLevelBadgeColor = (level: Activity["level"]) => {
    const colors: Record<Activity["level"], string> = {
      national: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      site: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      small_group: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return colors[level] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return <ActivitiesPageSkeleton />;
  }

  if (error) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Activities" description="Error" icon={ActivityIcon} />
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-center text-red-500">{error}</p>
            <div className="text-center mt-4">
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </RoleBasedGuard>
    );
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="Activities" 
        description="Track, manage, and analyze all activities across different levels."
        icon={ActivityIcon}
        actions={
          <Button asChild>
            <Link href="/dashboard/activities/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Activity
            </Link>
          </Button>
        }
      />

      <ActivityChart 
        activities={activities} 
        title="Activity Overview"
        description="A summary of activity statuses based on the current filters."
      />

      <Card>
        <CardHeader>
          <CardTitle>Activity List</CardTitle>
          <CardDescription>A comprehensive list of all activities you have access to.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by activity name..."
                className="pl-8 w-full"
                value={filters.searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={filters.dateFilter.rangeKey} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-shrink-0">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(filters.statusFilter).map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filters.statusFilter[status as keyof typeof filters.statusFilter]}
                    onCheckedChange={(checked) => setStatusFilter(prev => ({...prev, [status]: !!checked}))}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
                {availableLevelFilters.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Filter by Level</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableLevelFilters.map(level => (
                      <DropdownMenuCheckboxItem
                        key={level}
                        checked={filters.levelFilter[level as keyof typeof filters.levelFilter]}
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
                {activities.length > 0 ? (
                  activities.map(activity => (
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
                      <TableCell className="text-right">{activity.participantsCount ?? "N/A"}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild variant="ghost" size="icon" title="View Details">
                          <Link href={`/dashboard/activities/${activity.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        {canEditActivity(activity) && (
                          <Button asChild variant="ghost" size="icon" title="Edit Activity">
                            <Link href={`/dashboard/activities/${activity.id}/edit`}><Edit className="h-4 w-4" /></Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
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
