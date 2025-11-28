import { NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { createInvitation } from '@/services/invitationService';
import { createKindeUser } from '@/services/kindeManagementService';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const inviteSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.nativeEnum(UserRole),
    siteId: z.string().optional(),
    smallGroupId: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { getUser, isAuthenticated } = getKindeServerSession();
        if (!(await isAuthenticated())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (!currentUser || currentUser.role !== 'national_coordinator') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const result = inviteSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.errors }, { status: 400 });
        }

        const { email, role, siteId, smallGroupId } = result.data;

        // Check if user already exists
        const existingUser = await prisma.profile.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        const invitation = await createInvitation({
            email,
            role,
            siteId,
            smallGroupId,
        });

        let kindeId = null;
        try {
            // Split name into first and last name for Kinde
            const nameParts = result.data.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            const kindeUser = await createKindeUser({
                email,
                firstName,
                lastName: lastName || undefined,
            });
            kindeId = kindeUser.id;
        } catch (error) {
            console.error('Failed to create user in Kinde:', error);
            // We continue even if Kinde creation fails (e.g. user already exists)
            // But ideally we should check if it failed because user exists.
            // For now, we assume if it fails, the user might already be there or we handle it manually.
            // If we want to be strict, we could return an error here.
            // But let's allow "inviting" existing Kinde users to the app.
        }



        // If we got a Kinde ID, we could potentially pre-create the profile or link it.
        // But our current flow relies on the user logging in and /api/auth/me creating the profile.
        // So we just leave the invitation pending.

        return NextResponse.json({ success: true, invitation, kindeCreated: !!kindeId });

    } catch (error) {
        console.error('[INVITE_USER_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
