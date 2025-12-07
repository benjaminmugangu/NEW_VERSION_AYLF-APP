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
            site: {
                select: {
                    id: true,
                    name: true
                }
            },
            smallGroup: {
                select: {
                    id: true,
                    name: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('title')}
                description={t('description')}
                icon={UserPlus}
            />
            <InvitationsList invitations={invitations} />
        </div>
    );
}
