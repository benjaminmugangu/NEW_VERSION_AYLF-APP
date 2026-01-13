import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { getInvitationByToken } from '@/services/invitationService';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.email) {
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const startUrl = new URL(request.url);
    const token = startUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/dashboard?error=missing_token', request.url));
    }

    const response = await getInvitationByToken(token);

    if (!response.success || !response.data) {
        return NextResponse.redirect(new URL('/dashboard?error=invalid_invitation', request.url));
    }

    const invitation = response.data;

    if (invitation.status !== 'pending') {
        return NextResponse.redirect(new URL('/dashboard?error=invalid_invitation', request.url));
    }

    // ✅ SECURITY CHECK: Ensure authenticated email matches invitation email
    if (user.email !== invitation.email) {
        const authenticatedEmail = user.email;
        console.error('[SECURITY_ALERT] Invitation email mismatch', {
            invited: invitation.email,
            authenticated: authenticatedEmail
        });
        return NextResponse.redirect(new URL('/auth/accept-invitation?token=' + token + '&error=email_mismatch', request.url));
    }

    try {
        const name = `${user.given_name || ''} ${user.family_name || ''}`.trim() || 'Unknown User';

        await prisma.profile.upsert({
            where: { email: user.email },
            update: {
                role: invitation.role,
                siteId: invitation.siteId,
                smallGroupId: invitation.smallGroupId,
                mandateStartDate: invitation.mandateStartDate,
                mandateEndDate: invitation.mandateEndDate,
                status: 'active'
            },
            create: {
                id: user.id,
                email: user.email,
                name: name,
                role: invitation.role,
                siteId: invitation.siteId,
                smallGroupId: invitation.smallGroupId,
                mandateStartDate: invitation.mandateStartDate,
                mandateEndDate: invitation.mandateEndDate,
                status: 'active'
            }
        });

        await prisma.userInvitation.update({
            where: { id: invitation.id },
            data: { status: 'accepted' }
        });

        return NextResponse.redirect(new URL('/dashboard?welcome=true', request.url));

    } catch (error) {
        console.error('Failed to accept invitation:', error);
        return NextResponse.redirect(new URL('/dashboard?error=processing_failed', request.url));
    }
});
