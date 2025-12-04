import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: Request) {
    try {
        const { isAuthenticated, getUser } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        const currentUser = await prisma.profile.findUnique({
            where: { id: user.id },
        });

        if (!currentUser) {
            return NextResponse.json({ error: MESSAGES.errors.notFound }, { status: 404 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const smallGroupId = searchParams.get('smallGroupId');

        if (!siteId && !smallGroupId) {
            return NextResponse.json({ error: MESSAGES.errors.validation }, { status: 400 });
        }

        // RBAC
        if (currentUser.role !== 'national_coordinator') {
            if (siteId && currentUser.siteId !== siteId) {
                return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
            }
            if (smallGroupId && currentUser.smallGroupId !== smallGroupId) {
                // Allow site coordinator to view small group budget
                if (currentUser.role === 'site_coordinator' && currentUser.siteId) {
                    const group = await prisma.smallGroup.findUnique({ where: { id: smallGroupId } });
                    if (group?.siteId !== currentUser.siteId) {
                        return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
                    }
                } else if (currentUser.smallGroupId !== smallGroupId) {
                    return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
                }
            }
        }

        // Calculate Total Allocations
        const allocationWhere: any = {};
        if (siteId) allocationWhere.siteId = siteId;
        if (smallGroupId) allocationWhere.smallGroupId = smallGroupId;

        const allocations = await prisma.fundAllocation.aggregate({
            where: allocationWhere,
            _sum: { amount: true },
        });
        const totalAllocated = allocations._sum.amount || 0;

        // Calculate Total Expenses
        const expenseWhere: any = { type: 'expense' };
        if (siteId) expenseWhere.siteId = siteId;
        if (smallGroupId) expenseWhere.smallGroupId = smallGroupId;

        const expenses = await prisma.financialTransaction.aggregate({
            where: expenseWhere,
            _sum: { amount: true },
        });
        const totalSpent = expenses._sum.amount || 0;

        const remaining = totalAllocated - totalSpent;
        const percentageSpent = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

        let status = 'healthy';
        if (percentageSpent >= 100) status = 'exceeded';
        else if (percentageSpent >= 80) status = 'warning';

        return NextResponse.json({
            totalAllocated,
            totalSpent,
            remaining,
            percentageSpent,
            status,
        });

    } catch (error) {
        console.error('Error fetching budget status:', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
}
