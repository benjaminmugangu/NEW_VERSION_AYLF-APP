// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/shared/UserNav";
import { APP_NAME, NAVIGATION_LINKS, ROLES } from "@/lib/constants";
import type { NavItem } from "@/lib/types";
import { ChevronDown, ChevronUp, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace("/login");
    }
  }, [currentUser, isLoading, router]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavItems = (items: NavItem[], isSubmenu = false) => {
    return items
      .filter(item => currentUser && item.allowedRoles.includes(currentUser.role))
      .map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        if (item.children && item.children.length > 0) {
          const isSubmenuOpen = openSubmenus[item.label] || item.children.some(child => pathname.startsWith(child.href));
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
                  {item.children
                    .filter(child => currentUser && child.allowedRoles.includes(currentUser.role))
                    .map(child => (
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

        const MenuComponent = isSubmenu ? SidebarMenuSubButton : SidebarMenuButton;
        
        return (
          <SidebarMenuItem key={item.href}>
            <MenuComponent isActive={isActive} asChild tooltip={item.label}>
              <Link href={item.href}>
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
              </Link>
            </MenuComponent>
          </SidebarMenuItem>
        );
      });
  };

  if (isLoading || !currentUser) {
    return (
       <div className="flex h-screen">
        {/* Sidebar Skeleton */}
        <div className="w-64 border-r p-4 space-y-4 hidden md:block bg-sidebar">
          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
          <div className="mt-auto pt-4 border-t border-sidebar-border">
             <Skeleton className="h-8 w-full" />
          </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-8 md:hidden" /> {/* Mobile Trigger */}
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <Link href="/dashboard">
            <span className="flex items-center gap-2 group/logo">
              <Image 
                src="https://picsum.photos/seed/aylflogo/80/80" // Larger placeholder for logo
                alt="AYLF Logo" 
                width={40} // Increased width
                height={40} // Increased height
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
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} tooltip="Logout">
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 backdrop-blur-sm bg-opacity-80">
          <div className="md:hidden"> {/* Only show trigger on mobile/tablet */}
            <SidebarTrigger />
          </div>
          <div className="text-lg font-semibold hidden md:block"> {/* Title or breadcrumbs can go here */}
            {/* Example: {pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Dashboard'} */}
          </div>
          <div className="ml-auto">
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

