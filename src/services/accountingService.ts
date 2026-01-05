'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { AccountingPeriod, Prisma } from '@prisma/client';

export type CreateAccountingPeriodData = {
    type: 'month' | 'quarter' | 'year';
    startDate: Date;
    endDate: Date;
};

export async function createAccountingPeriod(data: CreateAccountingPeriodData) {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) throw new Error('Unauthorized');

    return await withRLS(user.id, async () => {
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
    });
}

export async function getAccountingPeriods() {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const userId = user?.id || 'anonymous';

    return await withRLS(userId, async () => {
        return await prisma.accountingPeriod.findMany({
            orderBy: { startDate: 'desc' },
            include: {
                closedBy: {
                    select: { name: true, email: true },
                },
            },
        });
    });
}

export async function getOpenAccountingPeriod() {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const userId = user?.id || 'anonymous';

    return await withRLS(userId, async () => {
        return await prisma.accountingPeriod.findFirst({
            where: { status: 'open' },
            orderBy: { startDate: 'asc' },
        });
    });
}

export async function closeAccountingPeriod(id: string, userId: string) {
    return await withRLS(userId, async () => {
        return await prisma.$transaction(async (tx: any) => {
            // Re-anchoring RLS context inside the transaction just in case, though prisma client extension should handle it
            await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${userId}'`);

            const period = await tx.accountingPeriod.findUnique({
                where: { id },
            });

            if (!period) throw new Error('Accounting period not found');
            if (period.status === 'closed') throw new Error('Accounting period already closed');

            const transactions = await fetchPeriodTransactions(tx, period);
            const { totalIncome, totalExpenses, netBalance } = calculateFinancials(transactions);

            const activities = await fetchPeriodActivities(tx, period);
            const stats = calculateActivityStats(activities);

            const sites = await tx.site.findMany({ select: { id: true, name: true } });
            const sitePerformance = calculateSitePerformance(sites, activities);

            const snapshotData = {
                totalIncome,
                totalExpenses,
                netBalance,
                transactionCount: transactions.length,
                ...stats,
                sitePerformance,
                generatedAt: new Date().toISOString(),
            };

            return await tx.accountingPeriod.update({
                where: { id },
                data: {
                    status: 'closed',
                    closedAt: new Date(),
                    closedById: userId,
                    snapshotData: snapshotData as Prisma.JsonObject,
                },
            });
        });
    });
}

async function fetchPeriodTransactions(tx: any, period: AccountingPeriod) {
    return await tx.financialTransaction.findMany({
        where: {
            date: { gte: period.startDate, lte: period.endDate },
            status: 'approved',
        },
    });
}

function calculateFinancials(transactions: any[]) {
    const totalIncome = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

    return { totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses };
}

async function fetchPeriodActivities(tx: any, period: AccountingPeriod) {
    return await tx.activity.findMany({
        where: {
            date: { gte: period.startDate, lte: period.endDate },
            status: { not: 'canceled' },
        },
        include: {
            reports: {
                select: {
                    girlsCount: true,
                    boysCount: true,
                    participantsCountReported: true,
                },
            },
        },
    });
}

function calculateActivityStats(activities: any[]) {
    const totalActivities = activities.length;
    const activitiesExecuted = activities.filter((a: any) => a.status === 'executed').length;
    let totalParticipants = 0;
    let totalBoysCount = 0;
    let totalGirlsCount = 0;

    for (const activity of activities) {
        if (activity.reports?.length > 0) {
            const report = activity.reports[0];
            totalParticipants += report.participantsCountReported || 0;
            totalBoysCount += report.boysCount || 0;
            totalGirlsCount += report.girlsCount || 0;
        } else {
            totalParticipants += activity.participantsCountPlanned || 0;
        }
    }

    return { totalActivities, activitiesExecuted, totalParticipants, totalBoysCount, totalGirlsCount };
}

function calculateSitePerformance(sites: any[], activities: any[]) {
    return sites.map((site: any) => {
        const siteActs = activities.filter((a: any) => (a as any).siteId === site.id);
        const siteExecuted = siteActs.filter((a: any) => (a as any).status === 'executed').length;
        return {
            siteId: site.id,
            siteName: site.name,
            totalActivities: siteActs.length,
            completedActivities: siteExecuted,
            completionRate: siteActs.length > 0 ? Math.round((siteExecuted / siteActs.length) * 100) : 0,
        };
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

/**
 * Checks if a given date falls within a closed accounting period.
 */
export async function isPeriodClosed(date: Date): Promise<{ closed: boolean; period?: AccountingPeriod }> {
    const period = await prisma.accountingPeriod.findFirst({
        where: {
            startDate: { lte: date },
            endDate: { gte: date },
            status: 'closed'
        }
    });
    return { closed: !!period, period: period || undefined };
}

/**
 * Safety guard: throws an error if the date is within a closed period.
 */
export async function checkPeriod(date: Date, actionName: string): Promise<void> {
    const { closed, period } = await isPeriodClosed(date);
    if (closed && period) {
        throw new Error(
            `PERIOD_CLOSED: L'action "${actionName}" est impossible car la date (${date.toLocaleDateString()}) ` +
            `appartient à une période comptable clôturée (ID: ${period.id}). ` +
            `Veuillez réouvrir la période ou changer la date.`
        );
    }
}
