import { redirect } from 'next/navigation';
import { ROLES } from '@/lib/constants';
import { MemberDashboardClient } from './components/MemberDashboardClient';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function MemberDashboard() {
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!(await isAuthenticated())) {
        redirect('/api/auth/login');
    }

    const kindeUser = await getUser();
    if (!kindeUser) redirect('/api/auth/login');

    const profile = await prisma.profile.findUnique({
        where: { id: kindeUser.id },
        include: {
            smallGroup: {
                include: {
                    site: true
                }
            }
        }
    });

    if (!profile || profile.role !== ROLES.MEMBER) {
        redirect('/dashboard');
    }

    // Fetch upcoming activities for the member's group
    let upcomingActivities: any[] = [];
    if (profile.smallGroupId) {
        upcomingActivities = await prisma.activity.findMany({
            where: {
                smallGroupId: profile.smallGroupId,
                status: 'planned',
                date: {
                    gte: new Date()
                }
            },
            orderBy: {
                date: 'asc'
            },
            take: 5
        });
    }

    return (
        <MemberDashboardClient
            userName={profile.name || 'Member'}
            groupName={profile.smallGroup?.name}
            siteName={profile.smallGroup?.site?.name}
            upcomingActivities={upcomingActivities}
        />
    );
}
