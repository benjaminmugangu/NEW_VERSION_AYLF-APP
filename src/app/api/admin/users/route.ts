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
    replaceExisting: z.boolean().optional(),
    existingCoordinatorId: z.string().optional(),
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

        const { email, role, siteId, smallGroupId, replaceExisting, existingCoordinatorId } = result.data;

        // ✨ REPLACEMENT WORKFLOW
        if (replaceExisting && existingCoordinatorId) {
            return await prisma.$transaction(async (tx) => {
                // 1. End existing coordinator's mandate
                await tx.profile.update({
                    where: { id: existingCoordinatorId },
                    data: {
                        mandateEndDate: new Date(),
                        status: 'inactive'
                    }
                });

                // 2. Create invitation for new coordinator
                const invitation = await createInvitation({
                    email,
                    role,
                    siteId,
                    smallGroupId,
                });

                // 3. Try to create Kinde user
                let kindeId = null;
                try {
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
                    console.error('Failed to create user in Kinde during replacement:', error);
                }

                // 4. TODO: Trigger certificate generation for replaced coordinator (Phase 3)

                return NextResponse.json({
                    success: true,
                    invitation,
                    kindeCreated: !!kindeId,
                    replaced: true
                });
            });
        }

        // ✨ REGULAR WORKFLOW (with uniqueness validation)

        // Check if user already exists
        const existingUser = await prisma.profile.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        // ✨ NEW: Coordinator Uniqueness Validation
        // Site Coordinator: Maximum 1 per site
        if (role === 'site_coordinator' && siteId) {
            const existingCoordinator = await prisma.profile.findFirst({
                where: {
                    siteId: siteId,
                    role: 'site_coordinator',
                    status: 'active',
                    mandateEndDate: null // Only active mandates
                },
                include: {
                    site: true
                }
            });

            if (existingCoordinator) {
                return NextResponse.json({
                    error: `${existingCoordinator.name} est déjà coordinateur de ${existingCoordinator.site?.name}. Voulez-vous le remplacer ?`,
                    conflictType: 'site_coordinator',
                    existingCoordinator: {
                        id: existingCoordinator.id,
                        name: existingCoordinator.name,
                        email: existingCoordinator.email,
                        mandateStartDate: existingCoordinator.mandateStartDate
                    }
                }, { status: 409 }); // HTTP 409 Conflict
            }
        }

        // Small Group Leader: Maximum 1 per group
        if (role === 'small_group_leader' && smallGroupId) {
            const existingLeader = await prisma.profile.findFirst({
                where: {
                    smallGroupId: smallGroupId,
                    role: 'small_group_leader',
                    status: 'active',
                    mandateEndDate: null
                },
                include: {
                    smallGroup: {
                        include: {
                            site: true
                        }
                    }
                }
            });

            if (existingLeader) {
                return NextResponse.json({
                    error: `${existingLeader.name} est déjà leader de ${existingLeader.smallGroup?.name}. Voulez-vous le remplacer ?`,
                    conflictType: 'small_group_leader',
                    existingLeader: {
                        id: existingLeader.id,
                        name: existingLeader.name,
                        email: existingLeader.email,
                        mandateStartDate: existingLeader.mandateStartDate
                    }
                }, { status: 409 });
            }
        }

        // National Coordinator: No limit (multiple allowed)
        // No validation needed

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
