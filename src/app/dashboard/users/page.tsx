// src/app/dashboard/users/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound, UserPlus, Edit, Trash2, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TableRowSkeleton } from "@/components/shared/skeletons/TableRowSkeleton";
import { useToast } from "@/hooks/use-toast";

import { useUsers } from "@/hooks/useUsers";
import type { User, Role } from "@/lib/types";

export default function ManageUsersPage() {
  const { toast } = useToast();
  const { users, isLoading, error, deleteUser } = useUsers();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  if (error) {
    toast({ title: "Error", description: error, variant: "destructive" });
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    const result = await deleteUser(userToDelete.id);

    if (result.success) {
      toast({ title: "Success", description: `User '${userToDelete.name}' has been deleted.` });
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete user.", variant: "destructive" });
    }

    setUserToDelete(null);
  };

  const getRoleDisplayName = (role: Role) => role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const getRoleBadgeVariant = (role: Role) => {
    switch(role) {
      case ROLES.NATIONAL_COORDINATOR: return "default";
      case ROLES.SITE_COORDINATOR: return "secondary";
      case ROLES.SMALL_GROUP_LEADER: return "outline";
      default: return "outline";
    }
  };



  const getInitials = (name: string) => {
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getUserStatusIcon = (status?: "active" | "inactive") => {
    return status === "inactive" ? <ShieldX className="h-3 w-3 text-destructive" /> : <ShieldCheck className="h-3 w-3 text-green-500"/>;
  }

  const getUserStatusBadgeVariant = (status?: "active" | "inactive") => {
     return status === "inactive" ? "destructive" : "default"
  }

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader 
        title="User Management"
        description="Administer user accounts, roles, and permissions."
        icon={UsersRound}
        actions={
          <Link href="/dashboard/users/new">
            <Button><UserPlus className="mr-2 h-4 w-4" /> Add New User</Button>
          </Link>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>List of all registered users and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRowSkeleton colSpan={6} cellWidths={['w-1/4', 'w-1/4', 'w-1/6', 'w-1/6', 'w-1/12', 'w-[120px]']} />
                ) : users.length > 0 ? (
                  users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1 items-center">

                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.assignment}</TableCell>
                      <TableCell>
                       <Badge variant={getUserStatusBadgeVariant(user.status)} className="gap-1 items-center text-xs px-1.5 py-0.5">
                        {getUserStatusIcon(user.status)}
                        {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Active"}
                      </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Link href={`/dashboard/users/${user.id}`}>
                          <Button variant="ghost" size="icon" title="Edit User"><Edit className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" title="Delete User" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleDeleteClick(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account for <span className="font-semibold">{userToDelete?.name}</span> and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleBasedGuard>
  );
}
