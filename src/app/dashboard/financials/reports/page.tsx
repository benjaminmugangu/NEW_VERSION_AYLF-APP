import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { reportService } from '@/services/reportService';
import FinancialReportsClient from './components/FinancialReportsClient';
import { User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

const FinancialReportsPage = async () => {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const profile: User = await profileService.getProfile(session.user.id);
  if (!profile || ![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR].includes(profile.role)) {
    // Or redirect to an unauthorized page
    return <p>You do not have permission to view this page.</p>;
  }

  try {
    const response = await reportService.getFilteredReports({ user: profile });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch reports.');
    }
    return <FinancialReportsClient reports={response.data} />;
  } catch (error) {
    console.error('Error fetching reports:', error);
    // Handle error state appropriately
    return <p>Could not load reports.</p>;
  }
};

export default FinancialReportsPage;
