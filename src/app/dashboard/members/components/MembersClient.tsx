"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, UserPlus, ListFilter, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { MemberStatsChart } from './MemberStatsChart';
import { MembersPageSkeleton } from '@/components/shared/skeletons/MembersPageSkeleton';
import { memberService } from '@/services/memberService';
import { ROLES } from '@/lib/constants';
import type { Member, MemberWithDetails, User } from '@/lib/types';

interface MembersClientProps {
  initialMembers: MemberWithDetails[];
  user: User;
}

export function MembersClient({ initialMembers, user }: MembersClientProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: 'All Time' });
  const [typeFilter, setTypeFilter] = useState<Record<Member['type'], boolean>>({ student: true, 'non-student': true });
  const [memberToDelete, setMemberToDelete] = useState<MemberWithDetails | null>(null);

  // Adapter le filtre de dates (strings -> Date) pour le service côté serveur
  const serverDateFilter = useMemo(() => {
    if (!dateFilter) return undefined;
    const fromDate = (dateFilter as any).from ? new Date((dateFilter as any).from) : undefined;
    const toDate = (dateFilter as any).to ? new Date((dateFilter as any).to) : undefined;
    return {
      rangeKey: (dateFilter as any).rangeKey,
      from: fromDate,
      to: toDate,
    } as { rangeKey?: string; from?: Date; to?: Date };
  }, [dateFilter]);

  const filters = { searchTerm, dateFilter: serverDateFilter, typeFilter };

  const { data: members, isLoading, error, refetch } = useQuery({
    queryKey: ['members', user.id, filters],
    queryFn: () => memberService.getFilteredMembers({ user, ...filters }),
    initialData: initialMembers,
    enabled: !!user,
  });

  const { mutate: deleteMember, isPending: isDeleting } = useMutation<void, Error, string>({
    mutationFn: (memberId: string) => memberService.deleteMember(memberId),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Member has been archived.' });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message || 'Failed to archive member.', variant: 'destructive' });
    },
  });

  const canCreateMember = useMemo(() => [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR].includes(user.role), [user.role]);

  const canEditOrDeleteMember = (member: MemberWithDetails) => {
    if (user.role === ROLES.NATIONAL_COORDINATOR) return true;
    if (user.role === ROLES.SITE_COORDINATOR && user.siteId === member.siteId) return true;
    return false;
  };

  if (isLoading && !initialMembers.length) {
    return <MembersPageSkeleton />;
  }

  return (
    <>
      <PageHeader
        title="Members"
        description="Track, manage, and analyze all members across the organization."
        icon={Users}
        actions={
          canCreateMember && (
            <Button asChild>
              <Link href="/dashboard/members/new">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Member
              </Link>
            </Button>
          )
        }
      />

      <MemberStatsChart
        members={members ?? []}
        title="Member Overview"
        description="A summary of member types based on the current filters."
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Member List</CardTitle>
          <CardDescription>A comprehensive list of all members you have access to.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className='text-center text-red-500 p-4'>
                <p>Error loading members: {error.message}</p>
                <Button onClick={() => refetch()} className='mt-2'>Try Again</Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, site, or group..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-shrink-0">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filter by Type
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Member Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(typeFilter).map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilter[type as keyof typeof typeFilter]}
                    onCheckedChange={(checked) => setTypeFilter(prev => ({ ...prev, [type]: !!checked }))}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Small Group</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members && members.length > 0 ? (
                  members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        <Badge variant={member.type === 'student' ? 'default' : 'secondary'}>
                          {member.type.charAt(0).toUpperCase() + member.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.siteName}</TableCell>
                      <TableCell>{member.smallGroupName}</TableCell>
                      <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button asChild variant="ghost" size="icon" title="View Details">
                          <Link href={`/dashboard/members/${member.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        {canEditOrDeleteMember(member) && (
                          <>
                            <Button asChild variant="ghost" size="icon" title="Edit Member">
                              <Link href={`/dashboard/members/${member.id}/edit`}><Edit className="h-4 w-4" /></Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Member"
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                              onClick={() => setMemberToDelete(member)}
                              disabled={isDeleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No members found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will archive the member <strong>{memberToDelete?.name}</strong>. They will be hidden from the list but can be recovered later by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => memberToDelete && deleteMember(memberToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
