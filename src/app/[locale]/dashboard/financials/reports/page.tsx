import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';
import FinancialReportsClient from './components/FinancialReportsClient';
import { User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const FinancialReportsPage = async () => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    redirect('/api/auth/login');
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
