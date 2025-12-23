import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { calculateAvailableBudget } from '@/services/budgetService';
import { MESSAGES } from '@/lib/messages';
import { withApiRLS } from '@/lib/apiWrapper';

export const GET = withApiRLS(async (request: NextRequest) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const siteId = searchParams.get('siteId') || undefined;
        const smallGroupId = searchParams.get('smallGroupId') || undefined;

        const budget = await calculateAvailableBudget({ siteId, smallGroupId });

        return NextResponse.json(budget);
    } catch (error: any) {
        const { sanitizeError, logError } = await import('@/lib/errorSanitizer');
        logError('FETCH_BUDGET', error);
        return NextResponse.json(
            { error: sanitizeError(error) },
            { status: 500 }
        );
    }
});
