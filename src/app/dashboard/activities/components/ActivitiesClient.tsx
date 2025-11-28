"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Activity as ActivityIcon, ListFilter, Eye, Edit, PlusCircle, Trash2 } from "lucide-react";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { ActivityChart } from "./ActivityChart";
import { useActivities } from "@/hooks/useActivities";
import { type User } from "@/lib/types";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/ui-custom/PageSkeleton";
import { DataFilter } from "@/components/ui-custom/DataFilter";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import type { Activity } from "@/lib/types";

interface ActivitiesClientProps {
  initialActivities: Activity[];
  user: User | null;
}

export function ActivitiesClient({ initialActivities, user }: ActivitiesClientProps) {
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
    deleteActivity,
  } = useActivities({ initialData: initialActivities, user });

  const router = useRouter();
  const { toast } = useToast();
  const [isConfirmOpen, setConfirmOpen] = React.useState(false);
  const [activityToDelete, setActivityToDelete] = React.useState<string | null>(null);

  const handleDeleteClick = (activityId: string) => {
    setActivityToDelete(activityId);
    setConfirmOpen(true);
  };

  const handleRowClick = (activityId: string) => {
    router.push(`/dashboard/activities/${activityId}`);
  };

  const handleConfirmDelete = async () => {
    if (!activityToDelete) return;

    try {
      await deleteActivity(activityToDelete);
      toast({ title: "Success", description: "Activity has been deleted." });
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message || "Could not delete activity.", variant: "destructive" });
    } finally {
      setConfirmOpen(false);
      setActivityToDelete(null);
    }
  };

  const getStatusBadgeVariant = (status: Activity["status"]) => {
    const variants: Partial<Record<Activity['status'], 'success' | 'default' | 'destructive' | 'warning'>> = {
      planned: 'default',
      executed: 'success',
      in_progress: 'warning',
      delayed: 'destructive',
      canceled: 'destructive',
    };
    return variants[status] || "default";
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
    return <PageSkeleton type="table" />;
  }

  if (error) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <p className="text-center text-red-500">{error.message}</p>
          <div className="text-center mt-4">
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
          <DataFilter
            searchPlaceholder="Search by activity name..."
            searchValue={filters.searchTerm}
            onSearchChange={setSearchTerm}
            className="mb-4"
          >
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={filters.dateFilter.rangeKey} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-shrink-0">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(filters.statusFilter).map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filters.statusFilter[status as Activity["status"]]}
                    onCheckedChange={checked => setStatusFilter(prev => ({ ...prev, [status]: checked }))}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                  </DropdownMenuCheckboxItem>
                ))}
                {availableLevelFilters.length > 0 && (
                  <>
                    <DropdownMenuLabel>Level</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableLevelFilters.map((level) => (
                      <DropdownMenuCheckboxItem
                        key={level}
                        checked={filters.levelFilter[level as keyof typeof filters.levelFilter]}
                        onCheckedChange={(checked) => {
                          setLevelFilter(prev => ({ ...prev, [level]: checked }));
                        }}
                      >
                        {level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </DataFilter>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
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
                    <TableRow key={activity.id} onClick={() => handleRowClick(activity.id)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{activity.title}</TableCell>
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
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button asChild variant="ghost" size="icon" title="View Details">
                          <Link href={`/dashboard/activities/${activity.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        {canEditActivity(activity) && (
                          <>
                            <Button asChild variant="ghost" size="icon" title="Edit Activity">
                              <Link href={`/dashboard/activities/${activity.id}/edit`}><Edit className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete Activity" onClick={() => handleDeleteClick(activity.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24">
                      <EmptyState
                        title="No activities found"
                        description="Try adjusting your filters or create a new activity."
                        icon={ActivityIcon}
                        actionLabel="Create Activity"
                        onAction={() => router.push('/dashboard/activities/new')}
                        className="border-none shadow-none min-h-[200px]"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActivityToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
