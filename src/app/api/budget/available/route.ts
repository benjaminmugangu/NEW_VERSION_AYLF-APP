import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { calculateAvailableBudget } from '@/services/budgetService';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: NextRequest) {
    try {
        const { isAuthenticated } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

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
}
