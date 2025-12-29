// src/app/dashboard/layout.tsx
import React from 'react';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { UserNav } from '@/components/shared/UserNav';
import { APP_NAME } from '@/lib/constants';
import { DashboardSidebar } from './components/DashboardSidebar';
import { withRLS } from '@/lib/prisma';
import { ClientOnly } from '@/components/shared/ClientOnly';
import { InvitationProcessor } from '@/components/auth/InvitationProcessor';
import { CustomOnboardingTour } from '@/components/shared/CustomOnboardingTour';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import { AuthSyncAlert } from '@/components/auth/AuthSyncAlert';
import { redirect } from 'next/navigation';
import { getSyncProfile } from '@/services/authService';

export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    redirect('/api/auth/login');
  }

  const kindeUserOrig = await getUser();
  if (!kindeUserOrig) {
    redirect('/api/auth/login');
  }

  // Cast for our service
  const kindeUser = {
    id: kindeUserOrig.id,
    email: kindeUserOrig.email,
    given_name: kindeUserOrig.given_name,
    family_name: kindeUserOrig.family_name
  };

  const effectiveUserId = kindeUser.id;

  return await withRLS(effectiveUserId, async () => {
    // Robustly fetch and sync profile
    const userProfile = await getSyncProfile(kindeUser);

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
          <AuthSyncAlert />
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
  });
}
