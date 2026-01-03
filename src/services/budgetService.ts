// src/services/allocations.service.ts
'use server';

import { prisma } from '@/lib/prisma';
import type { } from '@/lib/types'; // If all removed, I should check if I can remove the line.
// Wait, if I remove both FundAllocation and FundAllocationFormData (as per user request), the import might be empty.
// Let's check the file content again. It ends with:
// }): Promise<{ available: number; received: number; sent: number; expenses: number }> {
// It doesn't seem to return FundAllocation.
// So I will remove the import line if both are unused.

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
    const allocationsReceived = await client.fundAllocation.aggregate({
        where: {
            siteId,
            smallGroupId,
            status: 'completed', // Only count completed allocations
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

    // 3. Calculate EXPENSES (transactions of type 'expense')
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
    const available = Number(received) - Number(sent) - Number(totalExpenses);

    return {
        available,
        received: Number(received),
        sent: Number(sent),
        expenses: Number(totalExpenses),
    };
}
