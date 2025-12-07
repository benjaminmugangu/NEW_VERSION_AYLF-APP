import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportForm } from './components/ReportForm';
import { ROLES } from '@/lib/constants';
import { FilePlus2 } from 'lucide-react';
import { User } from '@/lib/types';
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

export default async function SubmitReportPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const t = await getTranslations('Reports');

  if (!user || !user.id) {
    redirect('/api/auth/login');
  }

  const profile: User = await profileService.getProfile(user.id);

  if (!profile || ![ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER].includes(profile.role)) {
    return (
      <div className="p-4">
        <p>{t('permission_denied')}</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t('submit_page_title')}
        description={t('submit_page_desc')}
        icon={FilePlus2}
      />
      <ReportForm user={profile} />
    </>
  );
}
