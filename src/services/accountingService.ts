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
    return await prisma.$transaction(async (tx: any) => {
        const period = await tx.accountingPeriod.findUnique({
            where: { id },
        });

        if (!period) throw new Error('Accounting period not found');
        if (period.status === 'closed') throw new Error('Accounting period already closed');

        const transactions = await tx.financialTransaction.findMany({
            where: {
                date: {
                    gte: period.startDate,
                    lte: period.endDate,
                },
                status: 'approved',
            },
        });

        const totalIncome = transactions
            .filter((t: any) => t.type === 'income')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter((t: any) => t.type === 'expense')
            .reduce((sum: number, t: any) => sum + t.amount, 0);

        const netBalance = totalIncome - totalExpenses;

        // 5. Activity & Participation Snapshots
        const activities = await tx.activity.findMany({
            where: {
                date: {
                    gte: period.startDate,
                    lte: period.endDate,
                },
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

        const totalActivities = activities.length;
        const activitiesExecuted = activities.filter((a: any) => a.status === 'executed').length;
        let totalParticipants = 0;
        let totalBoysCount = 0;
        let totalGirlsCount = 0;

        for (const activity of activities) {
            if (activity.reports && activity.reports.length > 0) {
                const report = activity.reports[0];
                totalParticipants += report.participantsCountReported || 0;
                totalBoysCount += report.boysCount || 0;
                totalGirlsCount += report.girlsCount || 0;
            } else {
                totalParticipants += activity.participantsCountPlanned || 0;
            }
        }

        // 6. Site Performance Snapshot
        const sites = await tx.site.findMany({ select: { id: true, name: true } });
        const sitePerformance = await Promise.all(sites.map(async (site: any) => {
            const siteActs = activities.filter((a: any) => (a as any).siteId === site.id);
            const siteExecuted = siteActs.filter((a: any) => (a as any).status === 'executed').length;
            return {
                siteId: site.id,
                siteName: site.name,
                totalActivities: siteActs.length,
                completedActivities: siteExecuted,
                completionRate: siteActs.length > 0 ? Math.round((siteExecuted / siteActs.length) * 100) : 0,
            };
        }));

        const snapshotData = {
            totalIncome,
            totalExpenses,
            netBalance,
            transactionCount: transactions.length,
            totalActivities,
            activitiesExecuted,
            totalParticipants,
            totalBoysCount,
            totalGirlsCount,
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
