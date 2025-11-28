import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const rejectSchema = z.object({
    reviewNotes: z.string().min(1, 'Review notes are required'),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { isAuthenticated, getUser } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is National Coordinator
        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (!currentUser || currentUser.role !== 'national_coordinator') {
            return NextResponse.json({ error: 'Forbidden: Only National Coordinators can reject reports' }, { status: 403 });
        }

        const body = await request.json();
        const result = rejectSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json({ error: 'Invalid input', details: result.error.errors }, { status: 400 });
        }

        const { reviewNotes } = result.data;

        // Get the report
        const report = await prisma.report.findUnique({
            where: { id },
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (report.status === 'approved') {
            return NextResponse.json({ error: 'Cannot reject an approved report' }, { status: 400 });
        }

        // Reject the report
        const updatedReport = await prisma.report.update({
            where: { id },
            data: {
                status: 'rejected',
                reviewNotes,
                reviewedById: user.id,
                reviewedAt: new Date(),
            },
            include: {
                submittedBy: true,
                reviewedBy: true,
                site: true,
                smallGroup: true,
                activityType: true,
            },
        });

        return NextResponse.json(updatedReport);
    } catch (error) {
        console.error('Error rejecting report:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
