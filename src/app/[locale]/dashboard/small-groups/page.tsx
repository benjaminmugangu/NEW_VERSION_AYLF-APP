"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { ROLES } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersRound, PlusCircle, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { TableRowSkeleton } from '@/components/shared/skeletons/TableRowSkeleton';
import { StatCard } from '@/components/shared/StatCard';
import { StatCardSkeleton } from '@/components/shared/skeletons/StatCardSkeleton';
import { useSmallGroups, type SmallGroupWithDetails } from '@/hooks/useSmallGroups';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function SmallGroupsPage() {
  const {
    smallGroups,
    isLoading,
    isError,
    error,
    deleteSmallGroup,
    isDeleting,
    searchTerm,
    setSearchTerm,
    canCreateSmallGroup,
    canEditOrDeleteSmallGroup,
  } = useSmallGroups();
  const { toast } = useToast();
  const [groupToDelete, setGroupToDelete] = useState<SmallGroupWithDetails | null>(null);

  const handleDelete = () => {
    if (!groupToDelete) return;

    deleteSmallGroup(groupToDelete.id, {
      onSuccess: () => {
        toast({ title: 'Success', description: `Small group "${groupToDelete.name}" has been permanently deleted.` });
        setGroupToDelete(null);
      },
      onError: (error) => {
        toast({ title: 'Error Deleting Group', description: error.message, variant: 'destructive' });
        setGroupToDelete(null);
      },
    });
  };

  const analytics = useMemo(() => {
    if (isLoading || smallGroups.length === 0) {
      return { totalGroups: 0, totalMembers: 0, avgMembers: '0.0' };
    }
    const totalGroups = smallGroups.length;
    const totalMembers = smallGroups.reduce((acc, sg) => acc + (sg.memberCount || 0), 0);
    return {
      totalGroups,
      totalMembers,
      avgMembers: totalGroups > 0 ? (totalMembers / totalGroups).toFixed(1) : '0.0',
    };
  }, [smallGroups, isLoading]);

  if (isError) {
    return (
      <div className="text-red-500 p-4 border border-red-500 rounded-md bg-red-50">
        <h2 className="text-lg font-bold">Failed to load small groups</h2>
        <p>{error?.message || 'An unknown error occurred.'}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Small Groups Management"
        description="View and manage all small groups across different sites."
        icon={UsersRound}
        actions={
          canCreateSmallGroup && (
            <Link href="/dashboard/small-groups/new">
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Group
              </Button>
            </Link>
          )
        }
      />
      <div className="grid gap-4 md:grid-cols-3 my-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard title="Total Small Groups" value={analytics.totalGroups} icon={UsersRound} />
            <StatCard title="Total Members" value={analytics.totalMembers} icon={UsersRound} />
            <StatCard title="Avg. Members / Group" value={analytics.avgMembers} icon={UsersRound} />
          </>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Small Groups</CardTitle>
          <CardDescription>A list of all registered small groups.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by group, site, or leader..."
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
                  <TableHead>Group Name</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Leader</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRowSkeleton
                    rowCount={5}
                    colSpan={5}
                    cellWidths={['w-1/3', 'w-1/4', 'w-1/4', 'w-1/6', 'w-[120px]']}
                  />
                ) : smallGroups.length > 0 ? (
                  smallGroups.map((sg) => {
                    const hasLeader = !!sg.leaderName;
                    const displayLeaderName = sg.leaderName || 'Aucun leader assigné';

                    return (
                      <TableRow key={sg.id}>
                        <TableCell className="font-medium">{sg.name}</TableCell>
                        <TableCell>{sg.siteName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              user={sg.leader || { name: sg.leaderName, role: 'SMALL_GROUP_LEADER' }}
                              size="md"
                              className={!hasLeader ? "opacity-40" : ""}
                            />
                            <span className={!hasLeader ? "text-muted-foreground italic text-sm" : ""}>
                              {displayLeaderName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{sg.memberCount}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Link href={`/dashboard/small-groups/${sg.id}`}>
                            <Button variant="ghost" size="icon" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canEditOrDeleteSmallGroup(sg) && (
                            <>
                              <Link href={`/dashboard/small-groups/${sg.id}/edit`}>
                                <Button variant="ghost" size="icon" title="Edit Group">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete Group"
                                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                onClick={() => setGroupToDelete(sg)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {searchTerm ? `No groups found for "${searchTerm}".` : 'No small groups found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. This will permanently delete the small group <strong>{groupToDelete?.name}</strong> and unassign all its members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
