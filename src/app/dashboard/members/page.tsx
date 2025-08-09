// src/app/dashboard/members/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, UserPlus, ListFilter, Search, Eye, Edit, Trash2 } from "lucide-react";
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
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter, type DateFilterValue } from "@/components/shared/DateRangeFilter";
import { MemberStatsChart } from "./components/MemberStatsChart";
import { useMembers } from "@/hooks/useMembers";
import { MembersPageSkeleton } from "@/components/shared/skeletons/MembersPageSkeleton";
import { ROLES } from "@/lib/constants";

export default function MembersPage() {
  const {
    members,
    isLoading,
    error,
    filters,
    setSearchTerm,
    setDateFilter,
    setTypeFilter,
    refetch,
    deleteMember,
    canCreateMember,
    canEditOrDeleteMember,
  } = useMembers();
  const { toast } = useToast();
  const [memberToDelete, setMemberToDelete] = useState<any | null>(null);

  if (isLoading) {
    return <MembersPageSkeleton />;
  }

  if (error) {
    return (
      <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
        <PageHeader title="Members" description="Error" icon={Users} />
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
        members={members} 
        title="Member Overview"
        description="A summary of member types based on the current filters."
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Member List</CardTitle>
          <CardDescription>A comprehensive list of all members you have access to.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, site, or group..."
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
                  Filter by Type
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Member Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.keys(filters.typeFilter).map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filters.typeFilter[type as keyof typeof filters.typeFilter]}
                    onCheckedChange={(checked) => setTypeFilter(prev => ({...prev, [type]: !!checked}))}
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
                {members.length > 0 ? (
                  members.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        <Badge variant={member.type === "student" ? "default" : "secondary"}>
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
              onClick={async () => {
                if (!memberToDelete) return;
                try {
                  await deleteMember(memberToDelete.id);
                  toast({ title: 'Success', description: `Member "${memberToDelete.name}" has been archived.` });
                } catch (error) {
                  toast({ 
                    title: 'Error', 
                    description: (error as Error).message || 'Failed to archive member.', 
                    variant: 'destructive' 
                  });
                } finally {
                  setMemberToDelete(null);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleBasedGuard>
  );
}
