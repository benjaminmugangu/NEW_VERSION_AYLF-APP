import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { exportAllocationsToCSV } from '@/services/exportService';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: NextRequest) {
    try {
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
}
