import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { reportService } from '@/services/reportService';
import ViewReportsClient from './components/ViewReportsClient';
import { User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

const ViewReportsPage = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const profile: User = await profileService.getProfile(session.user.id);

  if (!profile || ![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER].includes(profile.role)) {
    return <p>You do not have permission to view this page.</p>;
  }

  try {
    const response = await reportService.getFilteredReports({ user: profile });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch reports.');
    }

    return <ViewReportsClient initialReports={response.data} user={profile} />;
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return <p>Could not load reports: {error.message}</p>;
  }
};

export default ViewReportsPage;
