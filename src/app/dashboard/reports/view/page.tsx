import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { reportService } from '@/services/reportService';
import ViewReportsClient from './components/ViewReportsClient';
import { User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

const ViewReportsPage = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const profile: User = await profileService.getProfile(user.id);

  if (!profile || ![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER].includes(profile.role)) {
    return <p>You do not have permission to view this page.</p>;
  }

  try {
    const reports = await reportService.getFilteredReports({ user: profile });

    return <ViewReportsClient initialReports={reports} user={profile} />;
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return <p>Could not load reports: {error.message}</p>;
  }
};

export default ViewReportsPage;
