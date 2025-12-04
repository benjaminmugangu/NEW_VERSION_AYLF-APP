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
        console.error('Error fetching budget:', error);
        return NextResponse.json(
            { error: error.message || MESSAGES.errors.generic },
            { status: 500 }
        );
    }
}
