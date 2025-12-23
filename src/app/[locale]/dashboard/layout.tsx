// src/app/dashboard/layout.tsx
import React from 'react';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { UserNav } from '@/components/shared/UserNav';
import { APP_NAME } from '@/lib/constants';
import { DashboardSidebar } from './components/DashboardSidebar';
import { ClientOnly } from '@/components/shared/ClientOnly';
import type { User } from '@/lib/types';
import { InvitationProcessor } from '@/components/auth/InvitationProcessor';
import { CustomOnboardingTour } from '@/components/shared/CustomOnboardingTour';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';

export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  const kindeUser = await getUser();

  let userProfile: User | null = null;

  if (isAuth && kindeUser) {
    // 1. Try by ID
    let profile = await prisma.profile.findUnique({
      where: { id: kindeUser.id },
      include: { site: true, smallGroup: true }
    });

    // 2. Try by Email if not found by ID
    if (!profile && kindeUser.email) {
      profile = await prisma.profile.findUnique({
        where: { email: kindeUser.email.toLowerCase() },
        include: { site: true, smallGroup: true }
      });
    }

    if (profile) {
      userProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        siteId: profile.siteId,
        smallGroupId: profile.smallGroupId,
        siteName: profile.site?.name,
        smallGroupName: profile.smallGroup?.name,
        status: profile.status,
        mandateStartDate: profile.mandateStartDate?.toISOString(),
        mandateEndDate: profile.mandateEndDate?.toISOString(),
      };
    } else {
      // Fallback if not sync'd yet
      userProfile = {
        id: kindeUser.id,
        name: `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email || 'User',
        email: kindeUser.email || '',
        role: 'MEMBER',
        status: 'active'
      };
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <InvitationProcessor />
      <ClientOnly>
        <CustomOnboardingTour />
        <CommandPalette />
        <OfflineIndicator />
        <DashboardSidebar user={userProfile} />
      </ClientOnly>
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 backdrop-blur-sm bg-opacity-80">
          <div className="md:hidden">
            <ClientOnly>
              <SidebarTrigger />
            </ClientOnly>
          </div>
          <div className="text-lg font-semibold hidden md:block"></div>
          <div className="ml-auto flex items-center gap-2">
            <ClientOnly>
              <NotificationBell />
            </ClientOnly>
            <UserNav user={userProfile} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
