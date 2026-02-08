'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { Report, ReportWithDetails, User, ServiceResponse, ErrorCode } from '@/lib/types';
import { batchSignAvatars } from '../enrichmentService';
import { mapPrismaReportToModel } from './shared';

import { type DateFilterValue, getDateRangeFromFilterValue } from '@/lib/dateUtils';

export interface ReportFilters {
    user?: User | null;
    entity?: { type: 'site' | 'smallGroup'; id: string };
    searchTerm?: string;
    dateFilter?: DateFilterValue;
    statusFilter?: Record<Report['status'], boolean>;
    limit?: number;
    offset?: number;
}

const computeDateRange = (dateFilter?: DateFilterValue): { startDate?: Date; endDate?: Date } => {
    return getDateRangeFromFilterValue(dateFilter as any);
};

function applyDateFilter(where: any, dateFilter: DateFilterValue) {
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
            return where;
    }
}

function buildReportWhereClause(filters: ReportFilters) {
    const { user, entity, searchTerm, dateFilter, statusFilter } = filters;
    const where: any = {};

    if (entity) {
        return applyEntityFilter({}, entity);
    }

    if (user) {
        const userFilter = applyUserRoleFilter({}, user);
        if (!userFilter) return { id: 'nothing' };
        Object.assign(where, userFilter);
    }

    if (dateFilter) {
        applyDateFilter(where, dateFilter);
    }

    if (searchTerm) {
        where.title = { contains: searchTerm, mode: 'insensitive' };
    }

    if (statusFilter) {
        applyStatusFilter(where, statusFilter);
    }

    return where;
}

export async function getReportById(id: string): Promise<ServiceResponse<Report>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            const report = await prisma.report.findUnique({
                where: { id },
                include: {
                    submittedBy: true,
                    site: true,
                    smallGroup: true,
                    activityType: true,
                }
            });

            if (!report) throw new Error('NOT_FOUND: Report not found.');

            const model = await mapPrismaReportToModel(report);
            const signed = await batchSignAvatars([model], ['submittedByAvatarUrl']);
            return signed[0];
        });

        return { success: true, data: result };
    } catch (error: any) {
        let code = ErrorCode.INTERNAL_ERROR;
        if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
        return { success: false, error: { message: error.message, code } };
    }
}

export async function getFilteredReports(filters: ReportFilters): Promise<ServiceResponse<ReportWithDetails[]>> {
    try {
        const { user, entity } = filters;
        const { getUser } = getKindeServerSession();
        const sessionUser = user || await getUser();

        if (!sessionUser && !entity) {
            return { success: false, error: { message: 'User or entity is required to fetch reports.', code: ErrorCode.UNAUTHORIZED } };
        }

        const userId = sessionUser?.id || 'anonymous';

        const result = await withRLS(userId, async () => {
            const where = buildReportWhereClause(filters);
            const { limit, offset } = filters;

            const reports = await prisma.report.findMany({
                where,
                include: {
                    submittedBy: true,
                    site: true,
                    smallGroup: true,
                    activityType: true,
                },
                take: limit ? Number(limit) : undefined,
                skip: offset ? Number(offset) : undefined,
                orderBy: { submissionDate: 'desc' }
            });

            const models = await Promise.all(reports.map(mapPrismaReportToModel));
            return batchSignAvatars(models, ['submittedByAvatarUrl']);
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}
