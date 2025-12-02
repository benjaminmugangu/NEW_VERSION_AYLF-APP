'use server';

import { prisma } from '@/lib/prisma';
import { AccountingPeriod, Prisma } from '@prisma/client';

export type CreateAccountingPeriodData = {
    type: 'month' | 'quarter' | 'year';
    startDate: Date;
    endDate: Date;
};

export async function createAccountingPeriod(data: CreateAccountingPeriodData) {
    // Check for overlap
    const existing = await prisma.accountingPeriod.findFirst({
        where: {
            OR: [
                {
                    startDate: { lte: data.endDate },
                    endDate: { gte: data.startDate },
                },
            ],
        },
    });

    if (existing) {
        throw new Error(`Accounting period overlaps with existing period ${existing.id}`);
    }

    return await prisma.accountingPeriod.create({
        data: {
            type: data.type,
            startDate: data.startDate,
            endDate: data.endDate,
            status: 'open',
        },
    });
}

export async function getAccountingPeriods() {
    return await prisma.accountingPeriod.findMany({
        orderBy: { startDate: 'desc' },
        include: {
            closedBy: {
                select: { name: true, email: true },
            },
        },
    });
}

export async function getOpenAccountingPeriod() {
    return await prisma.accountingPeriod.findFirst({
        where: { status: 'open' },
        orderBy: { startDate: 'asc' },
    });
}

export async function closeAccountingPeriod(id: string, userId: string) {
    const period = await prisma.accountingPeriod.findUnique({
        where: { id },
    });

    if (!period) throw new Error('Accounting period not found');
    if (period.status === 'closed') throw new Error('Accounting period already closed');

    // Calculate snapshot data
    // 1. Total Income
    // 2. Total Expenses
    // 3. Net Balance
    // 4. Balance per Site/Group (optional, for advanced reporting)

    const transactions = await prisma.financialTransaction.findMany({
        where: {
            date: {
                gte: period.startDate,
                lte: period.endDate,
            },
            status: 'approved',
        },
    });

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpenses;

    const snapshotData = {
        totalIncome,
        totalExpenses,
        netBalance,
        transactionCount: transactions.length,
        generatedAt: new Date().toISOString(),
    };

    return await prisma.accountingPeriod.update({
        where: { id },
        data: {
            status: 'closed',
            closedAt: new Date(),
            closedById: userId,
            snapshotData: snapshotData as Prisma.JsonObject,
        },
    });
}

export async function reopenAccountingPeriod(id: string) {
    // Only allow if no subsequent periods are closed?
    // For now, simple reopen.
    return await prisma.accountingPeriod.update({
        where: { id },
        data: {
            status: 'open',
            closedAt: null,
            closedById: null,
            snapshotData: Prisma.DbNull,
        }
    })
}
