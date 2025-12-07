import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';
import ViewReportsClient from './components/ViewReportsClient';
import { User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ViewReportsPage = async () => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) {
    redirect('/api/auth/login');
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
