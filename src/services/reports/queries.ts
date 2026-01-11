'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { Report, ReportWithDetails, User } from '@/lib/types';
import { batchSignAvatars } from '../enrichmentService';
import { mapPrismaReportToModel } from './shared';

// Server-safe date filter
export type ServerDateFilter = {
    rangeKey?: string;
    from?: Date;
    to?: Date;
};

export interface ReportFilters {
    user?: User | null;
    entity?: { type: 'site' | 'smallGroup'; id: string };
    searchTerm?: string;
    dateFilter?: ServerDateFilter;
    statusFilter?: Record<Report['status'], boolean>;
}

const computeDateRange = (dateFilter?: ServerDateFilter): { startDate?: Date; endDate?: Date } => {
    if (!dateFilter || (!dateFilter.from && !dateFilter.to && !dateFilter.rangeKey) || dateFilter.rangeKey === 'all_time') return {};
    if (dateFilter.from || dateFilter.to) return { startDate: dateFilter.from, endDate: dateFilter.to };

    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const s = startOfDay(now);

    const rangeMap: Record<string, () => { startDate: Date; endDate: Date }> = {
        today: () => {
            const e = new Date(s);
            e.setDate(e.getDate() + 1);
            return { startDate: s, endDate: e };
        },
        this_week: () => {
            const diff = (s.getDay() + 6) % 7;
            s.setDate(s.getDate() - diff);
            const e = new Date(s);
            e.setDate(e.getDate() + 7);
            return { startDate: s, endDate: e };
        },
        this_month: () => {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            return { startDate: start, endDate: end };
        },
        last_30_days: () => {
            const start = new Date(s);
            start.setDate(start.getDate() - 30);
            return { startDate: start, endDate: s };
        },
        last_90_days: () => {
            const start = new Date(s);
            start.setDate(start.getDate() - 90);
            return { startDate: start, endDate: s };
        },
        this_year: () => {
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear() + 1, 0, 1);
            return { startDate: start, endDate: end };
        }
    };

    return rangeMap[dateFilter.rangeKey ?? 'all_time']?.() ?? {};
};

function applyDateFilter(where: any, dateFilter: ServerDateFilter) {
    const { startDate, endDate } = computeDateRange(dateFilter);
    if (startDate || endDate) {
        where.activityDate = {};
        if (startDate) where.activityDate.gte = startDate;
        if (endDate) where.activityDate.lte = endDate;
    }
}

function applyStatusFilter(where: any, statusFilter: Record<Report['status'], boolean>) {
    const activeStatuses = Object.entries(statusFilter)
        .filter(([, isActive]) => isActive)
        .map(([status]) => status);

    if (activeStatuses.length > 0) {
        where.status = { in: activeStatuses };
    }
}

function applyEntityFilter(where: any, entity: { type: 'site' | 'smallGroup'; id: string }) {
    if (entity.type === 'site') where.siteId = entity.id;
    else where.smallGroupId = entity.id;
    return where;
}

function applyUserRoleFilter(where: any, user: User) {
    switch (user.role) {
        case 'SITE_COORDINATOR':
            if (user.siteId) {
                where.siteId = user.siteId;
                return where;
            }
            return null;
        case 'SMALL_GROUP_LEADER':
            if (user.smallGroupId) {
                where.smallGroupId = user.smallGroupId;
                return where;
            }
            return null;
        default:
            // National Coordinator or others see everything (subject to other filters)
            return where;
    }
}

function buildReportWhereClause(filters: ReportFilters) {
    const { user, entity, searchTerm, dateFilter, statusFilter } = filters;
    const where: any = {};

    // 1. Entity Filter
    if (entity) {
        return applyEntityFilter({}, entity);
    }

    // 2. User Role Filter (if no entity)
    if (user) {
        const userFilter = applyUserRoleFilter({}, user);
        if (!userFilter) return { id: 'nothing' }; // invalid state
        Object.assign(where, userFilter);
    }

    // 3. Date Filter
    if (dateFilter) {
        applyDateFilter(where, dateFilter);
    }

    // 4. Search
    if (searchTerm) {
        where.title = { contains: searchTerm, mode: 'insensitive' };
    }

    // 5. Status
    if (statusFilter) {
        applyStatusFilter(where, statusFilter);
    }

    return where;
}

export async function getReportById(id: string): Promise<Report> {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const userId = user?.id || 'anonymous';

    return await withRLS(userId, async () => {
        const report = await prisma.report.findUnique({
            where: { id },
            include: {
                submittedBy: true,
                site: true,
                smallGroup: true,
                activityType: true,
            }
        });

        if (!report) {
            throw new Error('Report not found.');
        }

        const model = mapPrismaReportToModel(report);
        const signed = await batchSignAvatars([model], ['submittedByAvatarUrl']);
        return signed[0];
    });
}

export async function getFilteredReports(filters: ReportFilters): Promise<ReportWithDetails[]> {
    const { user, entity } = filters;
    const { getUser } = getKindeServerSession();
    const sessionUser = user || await getUser();

    if (!sessionUser && !entity) {
        throw new Error('User or entity is required to fetch reports.');
    }

    const userId = sessionUser?.id || 'anonymous';

    return await withRLS(userId, async () => {
        const where = buildReportWhereClause(filters);

        const reports = await prisma.report.findMany({
            where,
            include: {
                submittedBy: true,
                site: true,
                smallGroup: true,
                activityType: true,
            },
            orderBy: { submissionDate: 'desc' }
        });

        const models = reports.map(mapPrismaReportToModel);
        return batchSignAvatars(models, ['submittedByAvatarUrl']);
    });
}
