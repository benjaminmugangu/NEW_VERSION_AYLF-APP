// src/app/dashboard/users/[userId]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
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

export default async function UserDetailPage(props: any) {
  const { params } = props;
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const [currentUserProfile, targetUser] = await Promise.all([
    profileService.getProfile(session.user.id),
    profileService.getProfile(params.userId)
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
