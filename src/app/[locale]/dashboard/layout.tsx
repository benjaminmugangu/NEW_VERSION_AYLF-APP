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
import { UserRole } from '@prisma/client';
import { InvitationProcessor } from '@/components/auth/InvitationProcessor';
import { CustomOnboardingTour } from '@/components/shared/CustomOnboardingTour';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { CommandPalette } from '@/components/shared/CommandPalette';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getUser, isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();
  const kindeUser = await getUser();

  let userProfile: User | null = null;

  if (isAuth && kindeUser) {
    // Récupérer le profil depuis notre DB Prisma
    const profile = await prisma.profile.findUnique({
      where: { id: kindeUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        siteId: true,
        smallGroupId: true,
        status: true,
        mandateStartDate: true,
        mandateEndDate: true,
      }
    });

    if (profile) {
      userProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole, // Cast Prisma Enum -> App Type Enum
        siteId: profile.siteId,
        smallGroupId: profile.smallGroupId,
        status: profile.status,
        mandateStartDate: profile.mandateStartDate?.toISOString(),
        mandateEndDate: profile.mandateEndDate?.toISOString(),
      };
    } else {
      // Fallback si l'utilisateur est auth Kinde mais pas encore sync en DB
      // Note: Normalement /api/auth/me s'en charge, ou on pourrait l'auto-créer ici aussi par sécurité
      userProfile = {
        id: kindeUser.id,
        name: `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email || 'User',
        email: kindeUser.email || '',
        role: 'member', // Rôle par défaut temporaire
        status: 'active'
      }
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
