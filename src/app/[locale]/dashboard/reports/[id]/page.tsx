import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { notFound, redirect } from 'next/navigation';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';
import ReportReviewClient from './components/ReportReviewClient';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface ReportPageProps {
    params: Promise<{ id: string; locale: string }>;
}

export default async function ReportDetailPage({ params }: ReportPageProps) {
    const { id: reportId } = await params;
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.id) {
        redirect('/api/auth/login');
    }

    const profileResponse = await profileService.getProfile(user.id);
    if (!profileResponse.success || !profileResponse.data) {
        redirect('/api/auth/login');
    }

    const profile = profileResponse.data;

    // Fetch report details
    const reportResponse = await reportService.getReportById(reportId);

    if (!reportResponse.success || !reportResponse.data) {
        notFound();
    }

    const report = reportResponse.data;

    // RBAC: National Coordinator can see everything. 
    // Others must be linked to the site or group or be the submitter.
    const isNC = profile.role === ROLES.NATIONAL_COORDINATOR;
    const isSubmitter = report.submittedBy === profile.id;
    const isSiteCoord = profile.role === ROLES.SITE_COORDINATOR && report.siteId === profile.siteId;
    const isGroupLeader = profile.role === ROLES.SMALL_GROUP_LEADER && report.smallGroupId === profile.smallGroupId;

    if (!isNC && !isSubmitter && !isSiteCoord && !isGroupLeader) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h1 className="text-2xl font-bold text-destructive">Accès Refusé</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    Vous n'avez pas les permissions nécessaires pour consulter ce rapport.
                    Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <ReportReviewClient report={report} currentUser={profile} />
        </div>
    );
}
