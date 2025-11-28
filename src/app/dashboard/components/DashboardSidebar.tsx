"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton
} from '@/components/ui/sidebar';
import { LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { NAVIGATION_LINKS } from '@/lib/constants';
import type { NavItem } from '@/lib/types';

interface DashboardSidebarProps {
  user: User | null;
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

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
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        const Icon = item.icon;

        if (item.children && item.children.length > 0) {
          const isSubmenuOpen = openSubmenus[item.label] || item.children.some(child => pathname.startsWith(child.href));
          const filteredChildren = item.children.filter(child => !child.allowedRoles || child.allowedRoles.includes(userRole));
          if (filteredChildren.length === 0) return null;

          return (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                onClick={() => toggleSubmenu(item.label)}
                className="justify-between w-full"
                isActive={isActive || isSubmenuOpen}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
                {isSubmenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </SidebarMenuButton>
              {isSubmenuOpen && (
                <SidebarMenuSub>
                  {filteredChildren.map(child => (
                    <SidebarMenuSubItem key={child.href}>
                      <SidebarMenuSubButton isActive={pathname === child.href} asChild>
                        <Link href={child.href}>{child.label}</Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton isActive={isActive} asChild tooltip={item.label}>
              <Link href={item.href}>
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      });
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
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
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
