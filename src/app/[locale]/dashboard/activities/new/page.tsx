// src/app/dashboard/activities/new/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import NewActivityClient from './NewActivityClient';

export const dynamic = 'force-dynamic';

export default async function NewActivityPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    return redirect('/api/auth/login');
  }

  // Import withRLS
  const { withRLS } = await import('@/lib/prisma');

  return await withRLS(user.id, async () => {
    const profileService = await import('@/services/profileService');
    const profileResponse = await profileService.getProfile(user.id);

    const allowedRoles = [
      ROLES.NATIONAL_COORDINATOR,
      ROLES.SITE_COORDINATOR,
      ROLES.SMALL_GROUP_LEADER,
    ];

    if (!profileResponse.success || !profileResponse.data || !allowedRoles.includes(profileResponse.data.role)) {
      console.error('Profile not found or access denied for user:', user.id, user.email);
      return (
        <div className="p-4">
          <div className="max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Profile Sync Required</h1>
            <p className="text-muted-foreground">
              Your account identity needs to be synchronized. Please visit the
              <a href="/dashboard/diagnostics" className="text-primary underline ml-1">Diagnostics Page</a>
              to fix this issue and access this form.
            </p>
          </div>
        </div>
      );
    }

    return <NewActivityClient />;
  });
}
