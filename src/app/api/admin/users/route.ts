import { NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { createInvitation } from '@/services/invitationService';
import { createKindeUser } from '@/services/kindeManagementService';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { MESSAGES } from '@/lib/messages';

const inviteSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.nativeEnum(UserRole),
    siteId: z.string().optional(),
    smallGroupId: z.string().optional(),
    replaceExisting: z.boolean().optional(),
    existingCoordinatorId: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { getUser, isAuthenticated } = getKindeServerSession();
        if (!(await isAuthenticated())) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (currentUser?.role !== 'national_coordinator') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const body = await req.json();
        const result = inviteSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: MESSAGES.errors.validation, details: result.error.errors }, { status: 400 });
        }
        const payload = result.data;

        let invitation = null;
        let kindeId = null;
        let replaced = false;

        // ✨ REPLACEMENT WORKFLOW
        if (payload.replaceExisting && payload.existingCoordinatorId) {
            const result = await handleReplacementFlow(payload);
            invitation = result.invitation;
            kindeId = result.kindeId;
            replaced = true;
        } else {
            // ✨ REGULAR WORKFLOW (with uniqueness validation)
            const result = await handleRegularFlow(payload);

            // Handle error response from helper if any (e.g. conflict)
            if ('error' in result) {
                return NextResponse.json(result, { status: result.status || 409 });
            }

            invitation = result.invitation;
            kindeId = result.kindeId;
        }

        return NextResponse.json({
            success: true,
            invitation,
            kindeCreated: !!kindeId,
            replaced
        });

    } catch (error) {
        console.error('[INVITE_USER_ERROR]', error);
        return NextResponse.json({ error: MESSAGES.errors.serverError }, { status: 500 });
    }
}

// Helper Functions

async function handleReplacementFlow(payload: any) {
    let invitation = null;
    let kindeId = null;

    await prisma.$transaction(async (tx) => {
        // 1. End existing coordinator's mandate
        await tx.profile.update({
            where: { id: payload.existingCoordinatorId },
            data: { mandateEndDate: new Date() },
        });

        // 2. Create invitation for the new coordinator
        invitation = await createInvitation({
            email: payload.email,
            role: payload.role,
            siteId: payload.siteId,
            smallGroupId: payload.smallGroupId,
        });

        // 3. Try to create Kinde user
        try {
            const nameParts = payload.name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            const kindeUser = await createKindeUser({
                email: payload.email,
                firstName,
                lastName: lastName || undefined,
            });
            kindeId = kindeUser.id;
        } catch (error: any) {
            console.error('[KINDE_USER_CREATE_FAILED]', {
                type: error?.constructor?.name
            });
        }

        // 4. Trigger certificate generation
        const { generateCoordinatorCertificate } = await import('@/services/certificateGenerationService');
        try {
            await generateCoordinatorCertificate(payload.existingCoordinatorId!);
        } catch (error: any) {
            console.error('[CERTIFICATE_GENERATION_FAILED]', {
                type: error?.constructor?.name
            });
        }
    });

    return { invitation, kindeId };
}

async function handleRegularFlow(payload: any) {
    const { email, role, siteId, smallGroupId, name } = payload;

    // Check if user already exists
    const existingUser = await prisma.profile.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: 'User already exists', status: 409 };
    }

    // Uniqueness Validaition logic
    if (role === 'site_coordinator' && siteId) {
        const existingCoordinator = await prisma.profile.findFirst({
            where: {
                siteId: siteId,
                role: 'site_coordinator',
                status: 'active',
                mandateEndDate: null
            },
            include: { site: true }
        });

        if (existingCoordinator) {
            return {
                error: `${existingCoordinator.name} est déjà coordinateur de ${existingCoordinator.site?.name}. Voulez-vous le remplacer ?`,
                conflictType: 'site_coordinator',
                existingCoordinator: {
                    id: existingCoordinator.id,
                    name: existingCoordinator.name,
                    email: existingCoordinator.email,
                    mandateStartDate: existingCoordinator.mandateStartDate
                },
                status: 409
            };
        }
    }

    if (role === 'small_group_leader' && smallGroupId) {
        const existingLeader = await prisma.profile.findFirst({
            where: {
                smallGroupId: smallGroupId,
                role: 'small_group_leader',
                status: 'active',
                mandateEndDate: null
            },
            include: { smallGroup: { include: { site: true } } }
        });

        if (existingLeader) {
            return {
                error: `${existingLeader.name} est déjà leader de ${existingLeader.smallGroup?.name}. Voulez-vous le remplacer ?`,
                conflictType: 'small_group_leader',
                existingLeader: {
                    id: existingLeader.id,
                    name: existingLeader.name,
                    email: existingLeader.email,
                    mandateStartDate: existingLeader.mandateStartDate
                },
                status: 409
            };
        }
    }

    // Create Invitation
    const invitation = await createInvitation({
        email,
        role,
        siteId,
        smallGroupId,
    });

    let kindeId = null;
    try {
        const nameParts = name.split(' ');
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
    }

    return { invitation, kindeId };
}
