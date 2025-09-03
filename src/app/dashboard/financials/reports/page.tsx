import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { reportService } from '@/services/reportService';
import FinancialReportsClient from './components/FinancialReportsClient';
import { User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

const FinancialReportsPage = async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const profile: User = await profileService.getProfile(user.id);
  if (!profile || ![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR].includes(profile.role)) {
    // Or redirect to an unauthorized page
    return <p>You do not have permission to view this page.</p>;
  }

  try {
    const reports = await reportService.getFilteredReports({ user: profile });
    return <FinancialReportsClient reports={reports} />;
  } catch (error) {
    console.error('Error fetching reports:', error);
    // Handle error state appropriately
    return <p>Could not load reports.</p>;
  }
};

export default FinancialReportsPage;
