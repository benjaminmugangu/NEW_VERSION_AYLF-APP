// src/app/dashboard/users/[userId]/edit/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
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

export default async function EditUserPage(props: any) {
  const { params } = props;
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const [currentUserProfile, userToEdit] = await Promise.all([
    profileService.getProfile(session.user.id),
    profileService.getProfile(params.userId)
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

