import { redirect } from 'next/navigation';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
import { ROLES } from '@/lib/constants';
import { PageHeader } from '@/components/shared/PageHeader';
import { InvitationsList } from './components/InvitationsList';
import { UserPlus } from 'lucide-react';

export default async function InvitationsPage() {
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
                title="Invitations"
                description="Manage pending user invitations. Users will appear in the Users list once they accept their invitation and log in."
                icon={UserPlus}
            />
            <InvitationsList invitations={invitations} />
        </div>
    );
}
