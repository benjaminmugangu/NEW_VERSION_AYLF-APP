'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

/**
 * Export Transactions to CSV format
 */
export async function exportTransactionsToCSV(filters: {
    from?: string;
    to?: string;
    siteId?: string;
    smallGroupId?: string;
}): Promise<ServiceResponse<string>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            const where: any = {};

            if (filters.from || filters.to) {
                where.date = {};
                if (filters.from) where.date.gte = new Date(filters.from);
                if (filters.to) where.date.lte = new Date(filters.to);
            }

            if (filters.siteId) where.siteId = filters.siteId;
            if (filters.smallGroupId) where.smallGroupId = filters.smallGroupId;

            const transactions = await prisma.financialTransaction.findMany({
                where,
                include: {
                    site: true,
                    smallGroup: true,
                    recordedBy: true,
                    relatedReport: true,
                },
                orderBy: { date: 'desc' },
            });

            // Build CSV
            const header = [
                'Date',
                'Type',
                'Category',
                'Description',
                'Amount',
                'Site',
                'Small Group',
                'Recorded By',
                'Status',
                'Related Report',
                'Proof URL',
            ].join(',');

            const rows = (transactions as any[]).map((t: any) => {
                const date = new Date(t.date).toLocaleDateString('fr-FR');
                const type = t.type;
                const category = t.category;
                const description = `"${t.description?.replaceAll('"', '""').replaceAll(',', ';') || ''}"`;
                const amount = t.amount;
                const site = t.site?.name || '';
                const smallGroup = t.smallGroup?.name || '';
                const recordedBy = t.recordedBy?.name || '';
                const status = t.status;
                const relatedReport = t.relatedReport?.title || '';
                const proofUrl = t.proofUrl || '';

                return [
                    date,
                    type,
                    category,
                    description,
                    amount,
                    site,
                    smallGroup,
                    recordedBy,
                    status,
                    relatedReport,
                    proofUrl,
                ].join(',');
            });

            return [header, ...rows].join('\n');
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

/**
 * Export Fund Allocations to CSV format
 */
export async function exportAllocationsToCSV(filters: {
    from?: string;
    to?: string;
    siteId?: string;
    smallGroupId?: string;
}): Promise<ServiceResponse<string>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            const where: any = {};

            if (filters.from || filters.to) {
                where.allocationDate = {};
                if (filters.from) where.allocationDate.gte = new Date(filters.from);
                if (filters.to) where.allocationDate.lte = new Date(filters.to);
            }

            if (filters.siteId) where.siteId = filters.siteId;
            if (filters.smallGroupId) where.smallGroupId = filters.smallGroupId;

            const allocations = await prisma.fundAllocation.findMany({
                where,
                include: {
                    site: true,
                    smallGroup: true,
                    allocatedBy: true,
                    fromSite: true,
                },
                orderBy: { allocationDate: 'desc' },
            });

            // Build CSV
            const header = [
                'Date',
                'Source',
                'From Site',
                'To Site',
                'To Small Group',
                'Amount',
                'Goal',
                'Status',
                'Allocated By',
                'Proof URL',
                'Notes',
            ].join(',');

            const rows = (allocations as any[]).map((a: any) => {
                const date = new Date(a.allocationDate).toLocaleDateString('fr-FR');
                const source = a.source;
                const fromSite = a.fromSite?.name || '';
                const toSite = a.site?.name || '';
                const toSmallGroup = a.smallGroup?.name || '';
                const amount = a.amount;
                const goal = `"${a.goal.replaceAll('"', '""')}"`;
                const status = a.status;
                const allocatedBy = a.allocatedBy?.name || '';
                const proofUrl = a.proofUrl || '';
                const notes = a.notes ? `"${a.notes.replaceAll('"', '""')}"` : '';

                return [
                    date,
                    source,
                    fromSite,
                    toSite,
                    toSmallGroup,
                    amount,
                    goal,
                    status,
                    allocatedBy,
                    proofUrl,
                    notes,
                ].join(',');
            });

            return [header, ...rows].join('\n');
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}
