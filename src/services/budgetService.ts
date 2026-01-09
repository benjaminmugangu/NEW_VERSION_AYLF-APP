// src/services/allocations.service.ts
'use server';

import { prisma } from '@/lib/prisma';

/**
 * Calculate available budget for a Site or Small Group
 * Budget = Allocations Received - Allocations Sent - Expenses
 */
export async function calculateAvailableBudget(params: {
    siteId?: string;
    smallGroupId?: string;
}, tx?: any): Promise<{ available: number; received: number; sent: number; expenses: number }> {
    const { siteId, smallGroupId } = params;
    const client = tx || prisma;

    // For National level (no siteId/smallGroupId), assume unlimited budget
    if (!siteId && !smallGroupId) {
        return { available: Infinity, received: 0, sent: 0, expenses: 0 };
    }

    // 1. Calculate allocations RECEIVED
    // Logic: 
    // - For a Site: only count allocations where smallGroupId is NULL (funds for SC management)
    // - For a Small Group: count allocations specifically for that group
    const allocationsReceived = await client.fundAllocation.aggregate({
        where: {
            siteId,
            smallGroupId: smallGroupId ? smallGroupId : null, // EXCLUSIVE: if siteId is given but no smallGroupId, we only want the site-level funds
            status: 'completed',
        },
        _sum: {
            amount: true,
        },
    });
    const received = (allocationsReceived._sum.amount as any) || 0;

    // 2. Calculate allocations SENT (for Sites sending to Small Groups)
    const allocationsSent = await client.fundAllocation.aggregate({
        where: {
            fromSiteId: siteId, // Allocations sent FROM this site
            status: 'completed',
        },
        _sum: {
            amount: true,
        },
    });
    const sent = (allocationsSent._sum.amount as any) || 0;

    // 3. Calculate DIRECT INCOME (transactions of type 'income')
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
    const directIncome = (incomeTransactions._sum.amount as any) || 0;

    // 4. Calculate EXPENSES (transactions of type 'expense')
    const expenses = await client.financialTransaction.aggregate({
        where: {
            siteId,
            smallGroupId,
            type: 'expense',
            status: 'approved', // Only count approved expenses
        },
        _sum: {
            amount: true,
        },
    });
    const totalExpenses = (expenses._sum.amount as any) || 0;

    // Calculate available budget
    // Budget = (Allocations Received + Direct Income) - (Allocations Sent + Expenses)
    const available = (Number(received) + Number(directIncome)) - Number(sent) - Number(totalExpenses);

    return {
        available,
        received: Number(received),
        sent: Number(sent),
        expenses: Number(totalExpenses),
    };
}

/**
 * Deterministic helper to check for budget overruns.
 * Pure function (calculations only, no mutations).
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
 * [SCALABILITY FIX]
 * Calculates financial aggregates directly in the database to avoid fetching thousands of records.
 * Used by the Financial Dashboard.
 */
export async function calculateBudgetAggregates(params: {
    role: string;
    siteId?: string;
    smallGroupId?: string;
    dateFilter: { startDate?: Date; endDate?: Date };
}, tx?: any) {
    const { role, siteId, smallGroupId, dateFilter } = params;
    const client = tx || prisma;
    const { startDate, endDate } = dateFilter;

    // Date filter clause helper
    const dateClause = (dateField: string) => {
        if (!startDate && !endDate) return {};
        const clause: any = {};
        if (startDate) clause.gte = startDate;
        if (endDate) clause.lte = endDate;
        // Fix: If both are set, ensure we cover the full day if needed, but usually Date objects from filter are precise.
        return { [dateField]: clause };
    };

    // 1. Direct Income (Transactions)
    const incomeAgg = await client.financialTransaction.aggregate({
        where: {
            siteId: siteId || undefined,
            smallGroupId: smallGroupId || undefined,
            type: 'income',
            status: 'approved',
            ...dateClause('date')
        },
        _sum: { amount: true }
    });
    const directIncome = Number(incomeAgg._sum.amount || 0);

    // 2. Direct Expenses (Transactions)
    const expenseAgg = await client.financialTransaction.aggregate({
        where: {
            siteId: siteId || undefined,
            smallGroupId: smallGroupId || undefined,
            type: 'expense',
            status: 'approved',
            ...dateClause('date')
        },
        _sum: { amount: true }
    });
    const expenses = Number(expenseAgg._sum.amount || 0);

    // 3. Allocations Received
    // Logic: count 'completed' allocations targeting this entity
    const receivedClause: any = {
        status: 'completed',
        ...dateClause('allocationDate')
    };
    if (role === 'SITE_COORDINATOR' || (siteId && !smallGroupId)) {
        receivedClause.siteId = siteId;
        receivedClause.smallGroupId = null; // Site wallet only
        receivedClause.fromSiteId = { not: siteId }; // Don't count self-transfers (reallocations) as new income
    } else if (role === 'SMALL_GROUP_LEADER' || smallGroupId) {
        receivedClause.smallGroupId = smallGroupId;
    } else {
        // NATIONAL_COORDINATOR: Does not "receive" allocations (only creates them).
        // 1c. Secure Fix: Use empty IN clause instead of invalid UUID to return 0 results safely.
        receivedClause.id = { in: [] };
    }

    const receivedAgg = await client.fundAllocation.aggregate({
        where: receivedClause,
        _sum: { amount: true }
    });
    const receivedAllocations = Number(receivedAgg._sum.amount || 0);

    // 3b. Direct Group Injections (For SC visibility: National -> Group in my site)
    let directGroupInjections = 0;
    if (siteId && !smallGroupId) {
        const directInjectionAgg = await client.fundAllocation.aggregate({
            where: {
                siteId: siteId,
                smallGroupId: { not: null }, // Targeting a group
                fromSiteId: null, // Coming from National
                status: 'completed',
                ...dateClause('allocationDate')
            },
            _sum: { amount: true }
        });
        directGroupInjections = Number(directInjectionAgg._sum.amount || 0);
    }

    // 4. Outgoing Allocations (Reallocated Funds)
    const sentClause: any = {
        status: 'completed',
        ...dateClause('allocationDate')
    };
    if (role === 'NATIONAL_COORDINATOR' && !siteId) {
        // National context: Funds sent from National
        sentClause.fromSiteId = null;
    } else if (siteId && !smallGroupId) {
        // Site context: Funds sent from this Site
        sentClause.fromSiteId = siteId;
    } else {
        // SMALL_GROUP_LEADER: Groups do not reallocate funds to other entities.
        // 1c. Secure Fix: Use empty IN clause instead of invalid UUID to return 0 results safely.
        sentClause.id = { in: [] };
    }

    const sentAgg = await client.fundAllocation.aggregate({
        where: sentClause,
        _sum: { amount: true }
    });
    const totalAllocated = Number(sentAgg._sum.amount || 0);

    // 5. Total Spent in Reports (Aggregated from Report.totalExpenses)
    const reportWhere: any = {
        status: 'approved', // Only count approved reports expenses
        ...dateClause('submissionDate') // Or activityDate? Usually financial reports track by activity date
        // Note: financialsService used 'submissionDate' for filtering reports in getFinancials, but typically expenses match activity date. 
        // Let's stick to submissionDate to match previous logic, or activityDate if that's what was intended.
        // Previous code: `const filteredReports = applyDateFilter(reports || [], 'submissionDate', dateFilter);`
    };
    if (siteId) reportWhere.siteId = siteId;
    if (smallGroupId) reportWhere.smallGroupId = smallGroupId;

    const reportAgg = await client.report.aggregate({
        where: reportWhere,
        _sum: { totalExpenses: true }
    });
    const totalSpentInReports = Number(reportAgg._sum.totalExpenses || 0);

    // Consolidated Calculations
    const income = directIncome + receivedAllocations;
    const netBalance = income - (expenses + totalAllocated); // Note: totalSpentInReports is NOT subtracted from wallet balance, expenses are.
    const allocationBalance = totalAllocated - totalSpentInReports;

    return {
        income,
        expenses,
        netBalance,
        totalAllocated,
        totalSpent: totalSpentInReports,
        allocationBalance,
        directGroupInjections
    };
}
