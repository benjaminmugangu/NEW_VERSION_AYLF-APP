// src/components/shared/UserNav.tsx
"use client";

import { LogOut, UserCircle, Settings, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link"; // Import Link
import { ROLES } from "@/lib/constants";

export function UserNav() {
  const { currentUser, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (!currentUser) {
    return null; // Or a login button if appropriate for the context
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length-1]) { // Check if names[0] and names[names.length -1] exist
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const canEditProfile = currentUser.role === ROLES.SITE_COORDINATOR || currentUser.role === ROLES.SMALL_GROUP_LEADER || currentUser.role === ROLES.NATIONAL_COORDINATOR;


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage src={`https://avatar.vercel.sh/${currentUser.email}.png`} alt={currentUser.name} data-ai-hint="user avatar"/>
            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 py-1">
            <p className="text-sm font-semibold leading-none">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" asChild>
            <Link href="/dashboard/settings/profile" legacyBehavior>
              <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-default"> {/* Made non-interactive as it's just info */}
             <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{currentUser.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
          </DropdownMenuItem>
          {/* Future settings link can be added here if needed */}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
