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
import { useAuth } from "@/contexts/AuthContext";
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

    const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

    const displayName = currentUser.name || currentUser.email || 'User';
  const displayEmail = currentUser.email || 'No email provided';
  const displayRole = currentUser.role ? currentUser.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'No role assigned';



  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <Avatar className="h-10 w-10 border-2 border-primary">
                        <AvatarImage src={`https://avatar.vercel.sh/${displayEmail}.png`} alt={displayName} data-ai-hint="user avatar"/>
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 py-1">
                        <p className="text-sm font-semibold leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {displayEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/settings/profile" passHref>
            <DropdownMenuItem className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>My Profile</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem className="cursor-default"> {/* Made non-interactive as it's just info */}
             <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{displayRole}</span>
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
