import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import * as profileService from '@/services/profileService';
import * as reportService from '@/services/reportService';
import notificationService from '@/services/notificationService';
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

export const POST = withApiRLS(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const profile = await profileService.getProfile(user.id);

        // Only National Coordinators can approve reports
        if (profile.role !== 'NATIONAL_COORDINATOR') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const { id: reportId } = await params;

        // Get IP and User Agent for audit
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;

        // Approve the report (this will auto-generate transactions)
        const result = await reportService.approveReport(
            reportId,
            profile.id,
            ipAddress,
            userAgent
        );

        if (!result.success || !result.data) {
            throw new Error(result.error?.message || 'Failed to approve report');
        }

        const approvedReport = result.data;

        // Send notification to submitter
        await notificationService.notifyReportApproved(
            approvedReport.submittedBy,
            approvedReport.title,
            approvedReport.id
        );

        return NextResponse.json({
            success: true,
            report: approvedReport,
            message: MESSAGES.success.approved,
        });
    } catch (error: any) {
        const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
        logError('APPROVE_REPORT', error);
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
});
