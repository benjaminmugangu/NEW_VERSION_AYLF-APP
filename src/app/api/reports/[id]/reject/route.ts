import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import * as reportService from '@/services/reportService';
import { MESSAGES } from '@/lib/messages';
import * as z from 'zod';
import { safeParseJSON } from '@/lib/safeJSON';
import { withApiRLS } from '@/lib/apiWrapper';

const rejectReportSchema = z.object({
    rejectionReason: z.string().min(10, "Rejection reason must be at least 10 characters").max(500, "Rejection reason is too long").optional()
});

export const POST = withApiRLS(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({ where: { id: user.id } });
        if (!profile || profile.role !== 'NATIONAL_COORDINATOR') {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        const body = await safeParseJSON(request);
        const validation = rejectReportSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: MESSAGES.errors.validation, details: validation.error.format() },
                { status: 400 }
            );
        }

        const { rejectionReason } = validation.data;
        const resolvedParams = await params;
        const reportId = resolvedParams.id;

        if (!reportId) {
            return NextResponse.json({ error: MESSAGES.errors.validation }, { status: 400 });
        }

        const rejectedReport = await reportService.rejectReport(reportId, user.id, rejectionReason || '');

        return NextResponse.json({
            success: true,
            report: rejectedReport,
            message: MESSAGES.success.rejected,
        });
    } catch (error: any) {
        const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
        logError('REJECT_REPORT', error);
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
});
