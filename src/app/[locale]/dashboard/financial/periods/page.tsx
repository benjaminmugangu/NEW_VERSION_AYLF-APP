import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AccountingPeriodList } from '@/components/financial/AccountingPeriodList';
import { CreatePeriodDialog } from '@/components/financial/CreatePeriodDialog';
import { getAccountingPeriods } from '@/services/accountingService';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = [ROLES.NATIONAL_COORDINATOR];

export default async function AccountingPeriodsPage() {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.id) {
        redirect('/api/auth/login');
    }

    // Fetch profile for role check
    const profileService = await import('@/services/profileService');
    const userProfile = await profileService.getProfile(user.id);

    if (!userProfile || !ALLOWED_ROLES.includes(userProfile.role as any)) {
        redirect('/dashboard');
    }

    const periods = await getAccountingPeriods();

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Accounting Periods"
                description="Manage accounting periods for financial reporting and period closures."
                icon={Calendar}
                actions={<CreatePeriodDialog />}
            />

            <AccountingPeriodList periods={periods} currentUserId={user.id} />
        </div>
    );
}
