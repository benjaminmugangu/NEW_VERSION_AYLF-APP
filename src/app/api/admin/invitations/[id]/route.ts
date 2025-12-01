import { NextResponse } from 'next/server';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        if (!currentUser || currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        await prisma.userInvitation.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[DELETE_INVITATION_ERROR]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
