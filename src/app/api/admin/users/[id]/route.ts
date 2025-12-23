import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import * as profileService from '@/services/profileService';
import { checkDeletionEligibility } from '@/lib/safetyChecks';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

const updateUserSchema = z.object({
    role: z.nativeEnum(UserRole).optional(),
    siteId: z.string().optional().nullable(),
    smallGroupId: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive', 'invited']).optional(),
});

// ... inside PATCH function ...



export const PATCH = withApiRLS(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id } = await params;
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (currentUser?.role !== 'NATIONAL_COORDINATOR') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = updateUserSchema.parse(body);

        const updatedUser = await prisma.profile.update({
            where: { id },
            data: {
                role: validatedData.role,
                siteId: validatedData.siteId,
                smallGroupId: validatedData.smallGroupId,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
});

export const DELETE = withApiRLS(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id } = await params;
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }


        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (currentUser?.role !== 'NATIONAL_COORDINATOR') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        // Check for related data before deleting via Service
        const eligibility = await checkDeletionEligibility(id);

        if (!eligibility.canDelete) {
            return NextResponse.json(
                {
                    error: eligibility.reason,
                    details: "Data Integrity Violation"
                },
                { status: 409 }
            );
        }

        await prisma.profile.delete({
            where: { id },
        });

        return NextResponse.json({ message: MESSAGES.success.deleted });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
});
