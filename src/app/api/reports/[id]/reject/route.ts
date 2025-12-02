import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const profile = await profileService.getProfile(user.id);

        // Only National Coordinators can reject reports
        if (profile.role !== 'national_coordinator') {
            return NextResponse.json({ error: 'Forbidden: Only National Coordinators can reject reports' }, { status: 403 });
        }

        const { id: reportId } = await params;
        const body = await request.json();
        const { reason } = body;

        if (!reason || !reason.trim()) {
            return NextResponse.json({ error: 'Reason is required for rejection' }, { status: 400 });
        }

        // Get IP and User Agent for audit
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;

        // Reject the report
        const rejectedReport = await reportService.rejectReport(
            reportId,
            profile.id,
            reason,
            ipAddress,
            userAgent
        );

        return NextResponse.json({
            success: true,
            report: rejectedReport,
            message: 'Rapport rejeté.',
        });
    } catch (error: any) {
        console.error('Error rejecting report:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reject report' },
            { status: 500 }
        );
    }
}
