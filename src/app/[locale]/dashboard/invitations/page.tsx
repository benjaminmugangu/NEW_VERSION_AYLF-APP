import { redirect } from 'next/navigation';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { ROLES } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { InvitationsList } from './components/InvitationsList';
import { UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function InvitationsPage() {
    const t = await getTranslations('Invitations');
    const { getUser, isAuthenticated } = getKindeServerSession();
    const isAuth = await isAuthenticated();

    if (!isAuth) {
        redirect('/api/auth/login');
    }

    const kindeUser = await getUser();
    if (!kindeUser) {
        redirect('/api/auth/login');
    }

    const profile = await prisma.profile.findUnique({
        where: { id: kindeUser.id },
        select: { role: true }
    });

    if (!profile || profile.role !== ROLES.NATIONAL_COORDINATOR) {
        redirect('/dashboard');
    }

    // Fetch all pending invitations
    const invitations = await prisma.userInvitation.findMany({
        include: {
            site: { select: { id: true, name: true } },
            smallGroup: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    // ✨ ENRICH ACCEPTED INVITATIONS WITH LIVE PROFILE DATA
    // The invitation record is a snapshot at creation time. 
    // If the user's role or assignment changed after acceptance, we must show the LIVE profile data.
    const enrichedInvitations = await Promise.all(invitations.map(async (inv: any) => {
        if (inv.status === 'accepted') {
            const profile = await prisma.profile.findUnique({
                where: { email: inv.email },
                include: {
                    site: { select: { id: true, name: true } },
                    smallGroup: {
                        include: {
                            site: { select: { id: true, name: true } } // Fetch site via group as fallback
                        }
                    }
                }
            });

            if (profile) {
                // If user has no direct siteId (common for SGLs joined via group link only),
                // fallback to the site of their assigned Small Group.
                const effectiveSite = profile.site || profile.smallGroup?.site;

                return {
                    ...inv,
                    role: profile.role, // Live Role
                    site: effectiveSite, // Live Site (Direct or Inherited)
                    smallGroup: profile.smallGroup // Live Group
                };
            }
        }
        return inv;
    }));

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('title')}
                description={t('description')}
                icon={UserPlus}
            />
            <InvitationsList invitations={enrichedInvitations} />
        </div>
    );
}
