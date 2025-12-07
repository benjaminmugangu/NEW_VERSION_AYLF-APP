import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PendingReportsClient from "./components/PendingReportsClient";
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function PendingReportsPage() {
    const t = await getTranslations('Reports');
    const { isAuthenticated, getUser } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) {
        redirect("/login");
    }

    const user = await getUser();
    if (!user) {
        redirect("/login");
    }

    const currentUser = await prisma.profile.findUnique({
        where: { id: user.id },
    });

    if (!currentUser) {
        redirect("/dashboard");
    }

    // Build filter based on user role
    const where: any = {
        status: { in: ['pending', 'submitted'] },
    };

    // National Coordinator sees ALL pending reports
    // Site Coordinators see reports from their site
    // Others see their own reports
    if (currentUser.role === 'site_coordinator' && currentUser.siteId) {
        where.OR = [
            { siteId: currentUser.siteId },
            {
                smallGroupId: {
                    in: await prisma.smallGroup.findMany({
                        where: { siteId: currentUser.siteId },
                        select: { id: true }
                    }).then(groups => groups.map(g => g.id))
                }
            }
        ];
    } else if (currentUser.role !== 'national_coordinator') {
        where.submittedById = user.id;
    }

    // Fetch pending reports
    const reports = await prisma.report.findMany({
        where,
        include: {
            submittedBy: true,
            site: true,
            smallGroup: true,
            activityType: true,
        },
        orderBy: { submissionDate: 'desc' },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('view_title')}</h1>
                <p className="text-muted-foreground">
                    {currentUser.role === 'national_coordinator'
                        ? t('view_desc')
                        : currentUser.role === 'site_coordinator'
                            ? t('view_desc')
                            : t('view_desc')}
                </p>
            </div>
            <PendingReportsClient reports={reports} userRole={currentUser.role} />
        </div>
    );
}
