import { NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        if (!currentUser || currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const { id } = await params;

        await prisma.userInvitation.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[DELETE_INVITATION_ERROR]', error);
        return NextResponse.json({ error: MESSAGES.errors.serverError }, { status: 500 });
    }
}
