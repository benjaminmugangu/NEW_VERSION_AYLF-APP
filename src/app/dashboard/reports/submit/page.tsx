// src/app/dashboard/reports/submit/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportForm } from './components/ReportForm';
import { ROLES } from '@/lib/constants';
import { FilePlus2 } from 'lucide-react';
import { User } from '@/lib/types';

export default async function SubmitReportPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const profile: User = await profileService.getProfile(session.user.id);

  if (!profile || ![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER].includes(profile.role)) {
    return (
      <div className="p-4">
        <p>You do not have permission to submit reports.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Submit New Report"
        description="Document activities and outcomes for national, site, or small group levels."
        icon={FilePlus2}
      />
      <ReportForm user={profile} />
    </>
  );
}
