import { NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { MESSAGES } from '@/lib/messages';

export async function GET(request: Request) {
    try {
        const { user: currentUser } = await getAuthenticatedUser();
        if (!currentUser) {
            return NextResponse.json({ error: MESSAGES.errors.unauthorized }, { status: 401 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('siteId');
        const smallGroupId = searchParams.get('smallGroupId');

        if (!siteId && !smallGroupId) {
            return NextResponse.json({ error: MESSAGES.errors.validation }, { status: 400 });
        }

        // RBAC
        const accessError = await validateBudgetAccess(currentUser, siteId, smallGroupId);
        if (accessError) {
            return NextResponse.json({ error: MESSAGES.errors.forbidden }, { status: 403 });
        }

        // Calculate Stats
        const { totalAllocated, totalSpent } = await getBudgetStats(siteId, smallGroupId);

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

async function getAuthenticatedUser() {
    const { isAuthenticated, getUser } = getKindeServerSession();
    if (!(await isAuthenticated())) return { user: null };

    const user = await getUser();
    if (!user) return { user: null };

    const dbUser = await prisma.profile.findUnique({ where: { id: user.id } });
    return { user: dbUser };
}

async function validateBudgetAccess(currentUser: any, siteId: string | null, smallGroupId: string | null) {
    if (currentUser.role === 'national_coordinator') return null;

    if (siteId && currentUser.siteId !== siteId) {
        return 'Forbidden';
    }

    if (smallGroupId) {
        if (currentUser.role === 'site_coordinator' && currentUser.siteId) {
            const group = await prisma.smallGroup.findUnique({ where: { id: smallGroupId } });
            if (group?.siteId !== currentUser.siteId) return 'Forbidden';
        } else if (currentUser.smallGroupId !== smallGroupId) {
            return 'Forbidden';
        }
    }

    return null;
}

async function getBudgetStats(siteId: string | null, smallGroupId: string | null) {
    // Calculate Total Allocations
    const allocationWhere: Prisma.FundAllocationWhereInput = {};
    if (siteId) allocationWhere.siteId = siteId;
    if (smallGroupId) allocationWhere.smallGroupId = smallGroupId;

    const allocations = await prisma.fundAllocation.aggregate({
        where: allocationWhere,
        _sum: { amount: true },
    });
    const totalAllocated = allocations._sum.amount || 0;

    // Calculate Total Expenses
    const expenseWhere: Prisma.FinancialTransactionWhereInput = { type: 'expense' };
    if (siteId) expenseWhere.siteId = siteId;
    if (smallGroupId) expenseWhere.smallGroupId = smallGroupId;

    const expenses = await prisma.financialTransaction.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
    });
    const totalSpent = expenses._sum.amount || 0;

    return { totalAllocated, totalSpent };
}
