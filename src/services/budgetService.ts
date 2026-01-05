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
