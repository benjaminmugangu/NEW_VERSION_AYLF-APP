import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { exportTransactionsToCSV } from '@/services/exportService';
import { MESSAGES } from '@/lib/messages';
import { rateLimit } from '@/lib/rateLimit';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
    try {
        // 1. Rate Limit
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const { success } = await rateLimit(ip, { limit: 10, interval: 60 * 1000, uniqueTokenPerInterval: 500 }); // 10 exports per minute

        if (!success) {
            return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
        }

        const searchParams = request.nextUrl.searchParams;
        const filters = {
            from: searchParams.get('from') || undefined,
            to: searchParams.get('to') || undefined,
            siteId: searchParams.get('siteId') || undefined,
            smallGroupId: searchParams.get('smallGroupId') || undefined,
        };

        const csv = await exportTransactionsToCSV(filters);

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error: any) {
        const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
        logError('EXPORT_TRANSACTIONS', error);
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
});
