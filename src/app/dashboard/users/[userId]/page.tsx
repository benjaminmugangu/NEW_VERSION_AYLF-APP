// src/app/dashboard/users/[userId]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { UserDetailClient } from './components/UserDetailClient';
import { ROLES } from '@/lib/constants';
import { UnauthorizedMessage } from '../../../../components/shared/UnauthorizedMessage';

interface UserDetailPageProps {
  params: {
    userId: string;
  };
}

export default async function UserDetailPage(
  props: { params: Promise<{ userId: string }> }
) {
  const { params } = props;
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const [currentUserProfile, targetUser] = await Promise.all([
    profileService.getProfile(user.id),
    profileService.getProfile(userId)
  ]);

  if (!currentUserProfile) {
    console.error("Failed to retrieve current user's profile.");
    redirect('/login');
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
