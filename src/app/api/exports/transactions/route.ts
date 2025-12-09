import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { exportTransactionsToCSV } from '@/services/exportService';
import { MESSAGES } from '@/lib/messages';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
    try {
        // 1. Rate Limit
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const { success } = await rateLimit(ip, { limit: 10, interval: 60 * 1000, uniqueTokenPerInterval: 500 }); // 10 exports per minute

        if (!success) {
            return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
        }

        const { isAuthenticated } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
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
        console.error('Error exporting transactions:', error);
        return NextResponse.json(
            { error: error.message || MESSAGES.errors.generic },
            { status: 500 }
        );
    }
}
