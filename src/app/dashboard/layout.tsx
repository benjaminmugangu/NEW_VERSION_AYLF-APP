// src/app/dashboard/layout.tsx
import React from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { UserNav } from '@/components/shared/UserNav';
import { APP_NAME } from '@/lib/constants';
import { DashboardSidebar } from './components/DashboardSidebar';
import { ClientOnly } from '@/components/shared/ClientOnly';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return (
    <SidebarProvider defaultOpen>
      <ClientOnly>
        <DashboardSidebar user={user} />
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
            <UserNav user={user} />
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
