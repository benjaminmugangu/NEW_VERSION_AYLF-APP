import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';

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
            return NextResponse.json({ error: 'Forbidden: Only National Coordinators can approve reports' }, { status: 403 });
        }

        // Get the report
        const report = await prisma.report.findUnique({
            where: { id },
        });

        if (!report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (report.status === 'approved') {
            return NextResponse.json({ error: 'Report is already approved' }, { status: 400 });
        }

        // Approve the report
        const updatedReport = await prisma.report.update({
            where: { id },
            data: {
                status: 'approved',
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

        // Automatically set the associated activity status to 'executed'
        if (updatedReport.activityId) {
            await prisma.activity.update({
                where: { id: updatedReport.activityId },
                data: { status: 'executed' },
            });
        }

        return NextResponse.json(updatedReport);
    } catch (error) {
        console.error('Error approving report:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
