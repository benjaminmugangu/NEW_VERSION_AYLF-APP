// src/app/dashboard/users/page.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound, UserPlus, Edit, Trash2, ShieldCheck, ShieldX } from "lucide-react"; // Added ShieldX for inactive
import { Button } from "@/components/ui/button";
import { mockUsers, mockSites, mockSmallGroups } from "@/lib/mockData";
import type { User, Role } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function ManageUsersPage() {

  const getRoleDisplayName = (role: Role) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRoleBadgeVariant = (role: Role) => {
    switch(role) {
      case ROLES.NATIONAL_COORDINATOR: return "default"; 
      case ROLES.SITE_COORDINATOR: return "secondary";
      case ROLES.SMALL_GROUP_LEADER: return "outline"; 
      default: return "outline";
    }
  };
  
  const getAssignment = (user: User) => {
    if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
      return mockSites.find(s => s.id === user.siteId)?.name || "Unknown Site";
    }
    if (user.role === ROLES.SMALL_GROUP_LEADER && user.smallGroupId) {
      const sg = mockSmallGroups.find(s => s.id === user.smallGroupId);
      if (sg) {
        const site = mockSites.find(s => s.id === sg.siteId);
        return `${sg.name} (${site?.name || 'Unknown Site'})`;
      }
      return "Unknown Group";
    }
    return "N/A";
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
        description="Administer user accounts, roles, and permissions within AYLF."
        icon={UsersRound}
        actions={
          <Link href="/dashboard/users/new" passHref legacyBehavior>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Add New User
            </Button>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name} data-ai-hint="user avatar" />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1 items-center">
                        <ShieldCheck className="h-3 w-3"/>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getAssignment(user)}</TableCell>
                    <TableCell>
                       <Badge variant={getUserStatusBadgeVariant(user.status)} className="gap-1 items-center text-xs px-1.5 py-0.5">
                        {getUserStatusIcon(user.status)}
                        {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Link href={`/dashboard/users/${user.id}/edit`} passHref legacyBehavior>
                        <Button variant="ghost" size="icon" title="Edit User">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" title="Delete User (Not Implemented)" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" disabled>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-8 shadow-lg">
        <CardHeader>
            <CardTitle>User Statistics (Placeholder)</CardTitle>
            <CardDescription>Overview of user roles distribution and activity.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">User analytics and role distribution charts will be available here soon.</p>
             <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border p-4 rounded-lg bg-secondary/30 text-center">
                    <h4 className="text-2xl font-bold text-primary">{mockUsers.length}</h4>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="border p-4 rounded-lg bg-secondary/30 text-center">
                    <h4 className="text-2xl font-bold text-primary">{mockUsers.filter(u=>u.role === ROLES.NATIONAL_COORDINATOR).length}</h4>
                    <p className="text-sm text-muted-foreground">National Coordinators</p>
                </div>
                 <div className="border p-4 rounded-lg bg-secondary/30 text-center">
                    <h4 className="text-2xl font-bold text-primary">{mockUsers.filter(u=>u.role === ROLES.SITE_COORDINATOR).length}</h4>
                    <p className="text-sm text-muted-foreground">Site Coordinators</p>
                </div>
            </div>
        </CardContent>
      </Card>
    </RoleBasedGuard>
  );
}
