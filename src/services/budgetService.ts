// src/services/allocations.service.ts
'use server';

import { prisma } from '@/lib/prisma';
import type { FundAllocation, FundAllocationFormData } from '@/lib/types';

/**
 * Calculate available budget for a Site or Small Group
 * Budget = Allocations Received - Allocations Sent - Expenses
 */
export async function calculateAvailableBudget(params: {
    siteId?: string;
    smallGroupId?: string;
}): Promise<{ available: number; received: number; sent: number; expenses: number }> {
    const { siteId, smallGroupId } = params;

    // For National level (no siteId/smallGroupId), assume unlimited budget
    if (!siteId && !smallGroupId) {
        return { available: Infinity, received: 0, sent: 0, expenses: 0 };
    }

    // 1. Calculate allocations RECEIVED
    const allocationsReceived = await prisma.fundAllocation.aggregate({
        where: {
            siteId,
            smallGroupId,
            status: 'completed', // Only count completed allocations
        },
        _sum: {
            amount: true,
        },
    });
    const received = allocationsReceived._sum.amount || 0;

    // 2. Calculate allocations SENT (for Sites sending to Small Groups)
    const allocationsSent = await prisma.fundAllocation.aggregate({
        where: {
            fromSiteId: siteId, // Allocations sent FROM this site
            status: 'completed',
        },
        _sum: {
            amount: true,
        },
    });
    const sent = allocationsSent._sum.amount || 0;

    // 3. Calculate EXPENSES (transactions of type 'expense')
    const expenses = await prisma.financialTransaction.aggregate({
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
    const totalExpenses = expenses._sum.amount || 0;

    // Calculate available budget
    const available = received - sent - totalExpenses;

    return {
        available,
        received,
        sent,
        expenses: totalExpenses,
    };
}
