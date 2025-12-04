import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';
import { MESSAGES } from '@/lib/messages';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const profile = await profileService.getProfile(user.id);

        // Only National Coordinators can approve reports
        if (profile.role !== 'national_coordinator') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const { id: reportId } = await params;

        // Get IP and User Agent for audit
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;

        // Approve the report (this will auto-generate transactions)
        const approvedReport = await reportService.approveReport(
            reportId,
            profile.id,
            ipAddress,
            userAgent
        );

        return NextResponse.json({
            success: true,
            report: approvedReport,
            message: MESSAGES.success.approved,
        });
    } catch (error: any) {
        console.error('Error approving report:', error);
        return NextResponse.json(
            { error: error.message || MESSAGES.errors.generic },
            { status: 500 }
        );
    }
}
