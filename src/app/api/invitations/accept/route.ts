import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { getInvitationByToken } from '@/services/invitationService';

export async function GET(request: Request) {
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!(await isAuthenticated())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startUrl = new URL(request.url);
    const token = startUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/dashboard?error=missing_token', request.url));
    }

    const user = await getUser();
    const invitation = await getInvitationByToken(token);

    if (!invitation || invitation.status !== 'pending') {
        return NextResponse.redirect(new URL('/dashboard?error=invalid_invitation', request.url));
    }

    // ✅ SECURITY CHECK: Ensure authenticated email matches invitation email
    if (!user || user.email !== invitation.email) {
        // Redirect to an error page or dashboard with strictly formatted error
        // Safe logging
        const authenticatedEmail = user ? user.email : 'unknown';
        console.error('[SECURITY_ALERT] Invitation email mismatch', {
            invited: invitation.email,
            authenticated: authenticatedEmail
        });
        return NextResponse.redirect(new URL('/auth/accept-invitation?token=' + token + '&error=email_mismatch', request.url));
    }

    try {
        // 1. Update the User Profile
        // We assume the user profile exists because they just logged in/signed up.
        // If it was just created by Kinde, our webhook sync might have created it, 
        // OR we create it lazily here if missing. 
        // Usually, Kinde Webhook handles creation. But to be safe, we can upsert or just update.
        // Let's assume Profile exists (handled by sync). If not, we might fail or should create.

        // 1. Upsert the User Profile (Create if missing, Update if exists)
        // This handles cases where Kinde webhook hasn't run yet or failed.
        const name = `${user.given_name || ''} ${user.family_name || ''}`.trim() || 'Unknown User';

        await prisma.profile.upsert({
            where: { email: user.email },
            update: {
                role: invitation.role,
                siteId: invitation.siteId,
                smallGroupId: invitation.smallGroupId,
                mandateStartDate: invitation.mandateStartDate, // ✅ Apply mandate dates
                mandateEndDate: invitation.mandateEndDate,
                status: 'active'
            },
            create: {
                id: user.id, // Important: Use Kinde ID as Profile ID
                email: user.email,
                name: name,
                role: invitation.role,
                siteId: invitation.siteId,
                smallGroupId: invitation.smallGroupId,
                mandateStartDate: invitation.mandateStartDate, // ✅ Apply mandate dates
                mandateEndDate: invitation.mandateEndDate,
                status: 'active'
            }
        });

        // 2. Mark Invitation as Accepted
        await prisma.userInvitation.update({
            where: { id: invitation.id },
            data: { status: 'accepted' }
        });

        return NextResponse.redirect(new URL('/dashboard?welcome=true', request.url));

    } catch (error) {
        console.error('Failed to accept invitation:', error);
        return NextResponse.redirect(new URL('/dashboard?error=processing_failed', request.url));
    }
}
