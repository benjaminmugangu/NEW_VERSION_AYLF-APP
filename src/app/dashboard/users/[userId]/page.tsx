// src/app/dashboard/users/[userId]/page.tsx
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { notFound, redirect } from 'next/navigation';
// import { profileService } from '@/services/profileService'; // Removed unused static import
import { UserDetailClient } from './components/UserDetailClient';
import { ROLES } from '@/lib/constants';
import { UnauthorizedMessage } from '../../../../components/shared/UnauthorizedMessage';

interface UserDetailPageProps {
  params: {
    userId: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function UserDetailPage(
  props: { params: Promise<{ userId: string }> }
) {
  const { params } = props;
  const { userId } = await params;
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    redirect('/api/auth/login');
  }

  const profileService = await import('@/services/profileService');
  const [currentUserProfile, targetUser] = await Promise.all([
    profileService.getProfile(user.id),
    profileService.getProfile(userId)
  ]);

  if (!currentUserProfile) {
    console.error("Failed to retrieve current user's profile.");
    redirect('/dashboard');
  }

  const { role: currentUserRole } = currentUserProfile;

  // Security check: Only national and site coordinators can view user details.
  const isAuthorized = [
    ROLES.NATIONAL_COORDINATOR,
    ROLES.SITE_COORDINATOR
  ].includes(currentUserRole);

  if (!isAuthorized) {
    return <UnauthorizedMessage />;
  }

  if (!targetUser) {
    notFound();
  }

  // Determine if the current user has editing rights.
  const canEdit = currentUserRole === ROLES.NATIONAL_COORDINATOR;

  return <UserDetailClient user={targetUser} canEdit={canEdit} />;
}
