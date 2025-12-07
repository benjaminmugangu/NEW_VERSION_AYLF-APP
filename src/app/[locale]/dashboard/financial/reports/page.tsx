import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';
import PendingReportsTable from '@/components/financial/PendingReportsTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';

export default async function FinancialReportsPage() {
    const t = await getTranslations('Reports');
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
        redirect('/api/auth/login');
    }

    const profile = await profileService.getProfile(user.id);

    // Only National Coordinators can access this page
    if (profile.role !== 'national_coordinator') {
        redirect('/dashboard');
    }

    // Fetch all pending reports
    const pendingReports = await reportService.getFilteredReports({
        user: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role as any,
            siteId: profile.siteId || undefined,
            smallGroupId: profile.smallGroupId || undefined,
        },
        statusFilter: {
            pending: true,
            submitted: false,
            approved: false,
            rejected: false,
        },
    });

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t('submit_page_title')}</h1>
                <p className="text-muted-foreground mt-2">
                    {t('submit_page_desc')}
                </p>
            </div>

            <PendingReportsTable
                reports={pendingReports.map(r => ({
                    id: r.id,
                    title: r.title,
                    activityDate: r.activityDate,
                    submissionDate: r.submissionDate,
                    submittedByName: r.submittedByName || 'Inconnu',
                    siteName: r.siteName,
                    smallGroupName: r.smallGroupName,
                    totalExpenses: r.totalExpenses || undefined,
                    currency: r.currency || undefined,
                    participantsCountReported: r.participantsCountReported || undefined,
                    status: r.status as 'pending' | 'approved' | 'rejected',
                }))}
            />

            {/* Summary Card */}
            <Card>
                <CardHeader>
                    <CardTitle>ℹ️ {t('title')}</CardTitle>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <strong>{t('view_title')}</strong> {t('view_desc')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>{t('title')}</li>
                        <li>{t('description')}</li>
                        <li>{t('view_title')}</li>
                        <li>{t('view_desc')}</li>
                    </ul>
                    <p className="mt-4 text-muted-foreground">
                        {t('permission_denied')}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
