// src/services/budgetService.ts
'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

/**
 * Calculate available budget for a Site or Small Group
 * Budget = Allocations Received - Allocations Sent - Expenses
 * Primarily internal method used within other services.
 */
export async function calculateAvailableBudget(params: {
    siteId?: string;
    smallGroupId?: string;
}, tx?: any): Promise<{ available: number; received: number; sent: number; expenses: number }> {
    const { siteId, smallGroupId } = params;
    const client = tx || prisma;

    if (!siteId && !smallGroupId) {
        return { available: Infinity, received: 0, sent: 0, expenses: 0 };
    }

    const allocationsReceived = await client.fundAllocation.aggregate({
        where: {
            siteId,
            smallGroupId: smallGroupId ? smallGroupId : null,
            status: 'completed',
        },
        _sum: {
            amount: true,
        },
    });
    const received = Number(allocationsReceived._sum.amount || 0);

    const allocationsSent = await client.fundAllocation.aggregate({
        where: {
            fromSiteId: siteId,
            status: 'completed',
        },
        _sum: {
            amount: true,
        },
    });
    const sent = Number(allocationsSent._sum.amount || 0);

    const incomeTransactions = await client.financialTransaction.aggregate({
        where: {
            siteId,
            smallGroupId,
            type: 'income',
            status: 'approved',
        },
        _sum: {
            amount: true,
        },
    });
    const directIncome = Number(incomeTransactions._sum.amount || 0);

    const expenses = await client.financialTransaction.aggregate({
        where: {
            siteId,
            smallGroupId,
            type: 'expense',
            status: 'approved',
        },
        _sum: {
            amount: true,
        },
    });
    const totalExpenses = Number(expenses._sum.amount || 0);

    const available = (received + directIncome) - sent - totalExpenses;

    return {
        available,
        received,
        sent,
        expenses: totalExpenses,
    };
}

/**
 * Deterministic helper to check for budget overruns.
 * Used internally by mutations.
 */
export async function checkBudgetIntegrity(params: { siteId?: string; smallGroupId?: string }, tx?: any) {
    const budget = await calculateAvailableBudget(params, tx);
    return {
        isOverrun: budget.available < 0,
        balance: budget.available,
        details: budget
    };
}

/**
 * Calculates financial aggregates directly in the database.
 * 
 * NOTE: For NATIONAL_COORDINATOR, this naturally bypasses site-specific RLS 
 * as it aggregates across all records without specifying a restricted ID.
 */
export async function calculateBudgetAggregates(params: {
    role: string;
    siteId?: string;
    smallGroupId?: string;
    dateFilter: { startDate?: Date; endDate?: Date };
}, tx?: any): Promise<any> {
    const { role, siteId, smallGroupId, dateFilter } = params;
    const client = tx || prisma;
    const { startDate, endDate } = dateFilter;

    const dateClause = (dateField: string) => {
        if (!startDate && !endDate) return {};
        const clause: any = {};
        if (startDate) clause.gte = startDate;
        if (endDate) clause.lte = endDate;
        return { [dateField]: clause };
    };

    // For NC without siteId, filter for national-level (siteId = null) transactions
    const isNationalScope = role === 'NATIONAL_COORDINATOR' && !siteId && !smallGroupId;

    const incomeAgg = await client.financialTransaction.aggregate({
        where: {
            siteId: isNationalScope ? undefined : (siteId || undefined), // Consolidated for NC
            smallGroupId: isNationalScope ? undefined : (smallGroupId || undefined),
            type: 'income',
            status: 'approved',
            ...dateClause('date')
        },
        _sum: { amount: true }
    });
    const directIncome = Number(incomeAgg._sum.amount || 0);

    const expenseAgg = await client.financialTransaction.aggregate({
        where: {
            siteId: isNationalScope ? undefined : (siteId || undefined), // Consolidated for NC
            smallGroupId: isNationalScope ? undefined : (smallGroupId || undefined),
            type: 'expense',
            status: 'approved',
            ...dateClause('date')
        },
        _sum: { amount: true }
    });
    const expenses = Number(expenseAgg._sum.amount || 0);

    const receivedClause: any = {
        status: 'completed',
        ...dateClause('allocationDate')
    };
    if (isNationalScope) {
        // NC: no allocations are "received" at national level (NC sends, doesn't receive)
        receivedClause.id = { in: [] };
    } else if (role === 'SITE_COORDINATOR' || (siteId && !smallGroupId)) {
        receivedClause.siteId = siteId;
        receivedClause.smallGroupId = null;
        receivedClause.OR = [
            { fromSiteId: null },
            { fromSiteId: { not: siteId } }
        ];
    } else if (role === 'SMALL_GROUP_LEADER' || smallGroupId) {
        receivedClause.smallGroupId = smallGroupId;
    } else {
        receivedClause.id = { in: [] };
    }

    const receivedAgg = await client.fundAllocation.aggregate({
        where: receivedClause,
        _sum: { amount: true }
    });
    const totalAllocationsReceived = Number(receivedAgg._sum.amount || 0);

    let directGroupInjections = 0;
    if (siteId && !smallGroupId) {
        const directInjectionAgg = await client.fundAllocation.aggregate({
            where: {
                siteId: siteId,
                smallGroupId: { not: null },
                fromSiteId: null,
                status: 'completed',
                ...dateClause('allocationDate')
            },
            _sum: { amount: true }
        });
        directGroupInjections = Number(directInjectionAgg._sum.amount || 0);
    }

    const sentClause: any = {
        status: 'completed',
        ...dateClause('allocationDate')
    };
    if (role === 'NATIONAL_COORDINATOR' && !siteId) {
        sentClause.fromSiteId = null;
    } else if (siteId && !smallGroupId) {
        sentClause.fromSiteId = siteId;
    } else {
        sentClause.id = { in: [] };
    }

    const sentAgg = await client.fundAllocation.aggregate({
        where: sentClause,
        _sum: { amount: true }
    });
    const totalAllocated = Number(sentAgg._sum.amount || 0);

    const reportWhere: any = {
        status: { in: ['approved', 'submitted'] },
        ...dateClause('submissionDate')
    };
    if (siteId) reportWhere.siteId = siteId;
    if (smallGroupId) reportWhere.smallGroupId = smallGroupId;

    const reportAgg = await client.report.aggregate({
        where: reportWhere,
        _sum: { totalExpenses: true }
    });
    const totalSpentInReports = Number(reportAgg._sum.totalExpenses || 0);

    const totalIncome = directIncome + totalAllocationsReceived;

    // NC CONSOLIDATED VISION:
    // If we are at national scope, netBalance is what's left in the entire organization (Income - Expenses)
    // Internal allocations (sent to sites) are NOT subtracted from organizational net balance.
    const netBalance = isNationalScope
        ? totalIncome - expenses
        : totalIncome - (expenses + totalAllocated);
    const allocationBalance = totalAllocated - totalSpentInReports;

    return {
        income: totalIncome,
        totalAllocationsReceived,
        totalDirectIncome: directIncome,
        expenses,
        netBalance,
        totalAllocated,
        totalSpent: totalSpentInReports,
        allocationBalance,
        directGroupInjections
    };
}
