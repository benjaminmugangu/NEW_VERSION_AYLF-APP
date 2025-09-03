// src/app/dashboard/users/[userId]/edit/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { EditUserClient } from './components/EditUserClient';
import { ROLES } from '@/lib/constants';
import { UnauthorizedMessage } from '@/components/shared/UnauthorizedMessage';

interface EditUserPageProps {
  params: {
    userId: string;
  };
}

export default async function EditUserPage(
  props: { params: Promise<{ userId: string }> }
) {
  const { params } = props;
  const { userId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const [currentUserProfile, userToEdit] = await Promise.all([
    profileService.getProfile(user.id),
    profileService.getProfile(userId)
  ]);

  if (!currentUserProfile) {
    console.error("Failed to retrieve current user's profile.");
    redirect('/login');
  }
  
  // Security check: Only national coordinators can edit users.
  if (currentUserProfile.role !== ROLES.NATIONAL_COORDINATOR) {
    return <UnauthorizedMessage />;
  }

  if (!userToEdit) {
    notFound();
  }

  return <EditUserClient userToEdit={userToEdit} />;
}

