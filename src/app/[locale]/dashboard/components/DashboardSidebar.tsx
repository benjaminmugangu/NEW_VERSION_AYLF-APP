"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { User } from '@/lib/types';
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarMenuBadge // Import Badge
} from '@/components/ui/sidebar';
import { LogOut, ChevronDown, ChevronUp, Building, UsersRound, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';
import { NAVIGATION_LINKS } from '@/lib/constants';
import type { NavItem } from '@/lib/types';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

interface DashboardSidebarProps {
  user: User | null;
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const t = useTranslations();
  const tRole = useTranslations('Roles');

  const handleLogout = async () => {
    // Redirection vers l'API de logout Kinde
    window.location.href = '/api/auth/logout';
  };

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavItems = (items: NavItem[]) => {
    if (!user) return null;
    const userRole = user.role;

    return items
      .filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole))
      .map((item) => {
        // Basic active check (can be improved for exact matching with hooks)
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.includes(item.href));
        const Icon = item.icon;

        // Translate label using the key (item.label)
        // If key doesn't exist, it prints the key
        const label = t(item.label);

        if (item.children && item.children.length > 0) {
          const isSubmenuOpen = openSubmenus[item.label] || item.children.some(child => pathname.includes(child.href));
          const filteredChildren = item.children.filter(child => !child.allowedRoles || child.allowedRoles.includes(userRole));
          if (filteredChildren.length === 0) return null;

          return (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                onClick={() => toggleSubmenu(item.label)}
                className="justify-between w-full"
                isActive={isActive || isSubmenuOpen}
                data-tour={item.dataTour}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </span>
                {isSubmenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {/* Render Badge if exists */}
                {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
              </SidebarMenuButton>
              {isSubmenuOpen && (
                <SidebarMenuSub>
                  {filteredChildren.map(child => (
                    <SidebarMenuSubItem key={child.href}>
                      <SidebarMenuSubButton isActive={pathname.includes(child.href)} asChild data-tour={child.dataTour}>
                        <Link href={child.href}>{t(child.label)}</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton asChild isActive={isActive} data-tour={item.dataTour} className="relative">
              <Link href={item.href}>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
                {/* Render Badge if exists */}
                {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      });
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" data-tour="sidebar">
      <SidebarHeader className="p-4">
        <Link href="/dashboard">
          <span className="flex items-center gap-2 group/logo">
            <Image
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROsJ0oRg8RYoAuUWm025MBmI5tjiHUI-Pcgw&s"
              alt="AYLF Logo"
              width={40}
              height={40}
              className="rounded-full transition-transform duration-300 group-hover/logo:scale-110"
            />
            <span className="font-bold text-xl text-primary group-hover/logo:text-accent-foreground transition-colors">
              AYLF Connect
            </span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {renderNavItems(NAVIGATION_LINKS)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <div className="mb-2 px-2">
          <LanguageSwitcher />
        </div>
        {user && (
          <div className="mb-4 px-4 py-3 bg-muted/30 rounded-lg mx-2 border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage
                  src={user.avatarUrl ? `${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : undefined}
                  alt={user.name}
                />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {user.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm truncate">{user.name}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {tRole(user.role as any)}
                </Badge>
                {!['NATIONAL_COORDINATOR', 'ADMIN'].includes(user.role) && user.siteName && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-background flex items-center gap-1">
                    <Building className="w-2.5 h-2.5" />
                    {user.siteName}
                  </Badge>
                )}
                {!['NATIONAL_COORDINATOR', 'ADMIN'].includes(user.role) && user.smallGroupName && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-background flex items-center gap-1">
                    <UsersRound className="w-2.5 h-2.5" />
                    {user.smallGroupName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="h-12 md:h-10 text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut className="h-6 w-6 md:h-5 md:w-5" />
                <span className="text-base md:text-sm font-medium">{t('Navigation.logout')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar >
  );
}
