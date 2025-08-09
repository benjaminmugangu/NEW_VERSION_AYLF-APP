// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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
import { UserNav } from "@/components/shared/UserNav";
import { APP_NAME, NAVIGATION_LINKS } from "@/lib/constants";
import type { NavItem } from "@/lib/types";
import { ChevronDown, ChevronUp, LogOut } from "lucide-react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/shared/ClientOnly";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading && !currentUser) {
      router.replace("/login");
    }
  }, [currentUser, isLoading, router, isMounted]);

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavItems = (items: NavItem[]) => {
    if (!currentUser) return null;

    return items
      .filter(item => !item.allowedRoles || item.allowedRoles.includes(currentUser.role))
      .map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;

        if (item.children && item.children.length > 0) {
          const isSubmenuOpen = openSubmenus[item.label] || item.children.some(child => pathname.startsWith(child.href));
          const filteredChildren = item.children.filter(child => !child.allowedRoles || child.allowedRoles.includes(currentUser.role));
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
    <SidebarProvider defaultOpen>
      <ClientOnly>
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
            {isMounted && !isLoading ? renderNavItems(NAVIGATION_LINKS) : (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
              </div>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          {isMounted && currentUser && (
            <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton onClick={logout} tooltip="Logout">
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>
        </Sidebar>
      </ClientOnly>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 backdrop-blur-sm bg-opacity-80">
          <div className="md:hidden">
            <ClientOnly>
              <SidebarTrigger />
            </ClientOnly>
          </div>
          <div className="text-lg font-semibold hidden md:block"></div>
          <div className="ml-auto">
            {isMounted && currentUser ? <UserNav /> : <Skeleton className="h-10 w-10 rounded-full" />}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {isMounted && currentUser ? children : (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          )}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
