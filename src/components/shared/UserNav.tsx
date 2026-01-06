// src/components/shared/UserNav.tsx
"use client";

import { LogOut, UserCircle, ShieldCheck } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
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
// import { createSupabaseBrowserClient } from '@/lib/supabase/client';
// import { useRouter } from 'next/navigation';
import Link from "next/link";
import type { User } from '@/lib/types';

import { useCurrentUser } from "@/contexts/AuthContext";

interface UserNavProps {
  user: User | null; // Initial user from server
}

export function UserNav({ user: initialUser }: UserNavProps) {
  const { currentUser } = useCurrentUser();
  const user = currentUser || initialUser;
  // const router = useRouter();

  const handleLogout = async () => {
    // Redirection vers l'API de logout Kinde
    window.location.href = "/api/auth/logout";
  };

  if (!user) {
    return null; // The parent component decides whether to show this or a login button
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const displayName = user.name || user.email || 'User';
  const displayEmail = user.email || 'No email provided';
  const displayRole = user.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'No role assigned';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
          <UserAvatar user={user} size="md" className="h-10 w-10 border-2 border-primary" />
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
          <DropdownMenuItem className="cursor-default">
            <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{displayRole}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
