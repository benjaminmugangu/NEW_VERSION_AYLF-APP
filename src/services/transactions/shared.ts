import { FinancialTransaction, User } from '@/lib/types';
import { DateFilterValue, getDateRangeFromFilterValue } from '@/lib/dateUtils';

export interface TransactionFilters {
    user?: User | null;
    entity?: { type: 'site' | 'smallGroup'; id: string };
    searchTerm?: string;
    dateFilter?: DateFilterValue;
    typeFilter?: 'income' | 'expense';
    limit?: number; // Added for scalability
}

// Helper to map Prisma result to FinancialTransaction type
export const mapPrismaTransactionToModel = (tx: any): FinancialTransaction => {
    return {
        id: tx.id,
        date: tx.date ? tx.date.toISOString() : '',
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        siteId: tx.siteId || undefined,
        siteName: tx.site?.name,
        smallGroupId: tx.smallGroupId || undefined,
        smallGroupName: tx.smallGroup?.name,
        recordedById: tx.recordedById,
        recordedByName: tx.recordedBy?.name,
        recordedByRole: tx.recordedBy?.role,
        // Note: avatarUrl will be signed by the caller/fetcher
        recordedByAvatarUrl: tx.recordedBy?.avatarUrl,
        // NEW fields
        status: (tx.status ?? 'approved') as string,
        approvedById: tx.approvedById || undefined,
        approvedByName: tx.approvedBy?.name,
        approvedAt: tx.approvedAt ? tx.approvedAt.toISOString() : undefined,
        relatedReportId: tx.relatedReportId || undefined,
        relatedActivityId: tx.relatedActivityId || undefined,
        proofUrl: tx.proofUrl || undefined,
    };
};

export function applyEntityFilter(where: any, entity: { type: 'site' | 'smallGroup'; id: string }) {
    if (entity.type === 'site') {
        where.siteId = entity.id;
    } else {
        where.smallGroupId = entity.id;
    }
}

export function applyUserRoleFilter(where: any, user: User) {
    if (user.role === 'NATIONAL_COORDINATOR') {
        // NC sees national-level transactions (siteId = null)
        where.siteId = null;
    } else if (user.role === 'SITE_COORDINATOR' && user.siteId) {
        where.siteId = user.siteId;
    } else if (user.role === 'SMALL_GROUP_LEADER' && user.smallGroupId) {
        where.smallGroupId = user.smallGroupId;
    }
}

export function buildTransactionWhereClause(filters: TransactionFilters) {
    const { user, entity, searchTerm, dateFilter, typeFilter } = filters;
    const where: any = {};

    if (entity) {
        applyEntityFilter(where, entity);
    } else if (user) {
        applyUserRoleFilter(where, user);
    }

    if (dateFilter) {
        const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = startDate;
            if (endDate) where.date.lte = endDate;
        }
    }

    if (searchTerm) {
        where.description = { contains: searchTerm, mode: 'insensitive' };
    }

    if (typeFilter) {
        where.type = typeFilter;
    }

    return where;
}
