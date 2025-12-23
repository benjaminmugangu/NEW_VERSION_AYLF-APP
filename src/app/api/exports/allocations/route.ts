import { NextRequest, NextResponse } from 'next/server';
import { exportAllocationsToCSV } from '@/services/exportService';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const filters = {
            from: searchParams.get('from') || undefined,
            to: searchParams.get('to') || undefined,
            siteId: searchParams.get('siteId') || undefined,
            smallGroupId: searchParams.get('smallGroupId') || undefined,
        };

        const csv = await exportAllocationsToCSV(filters);

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="allocations_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error: any) {
        const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
        logError('EXPORT_ALLOCATIONS', error);
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
});
