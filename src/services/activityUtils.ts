import { Activity, ActivityStatus } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { ActivityFormData } from '@/schemas/activity';

// ============================================
// MAPPERS
// ============================================

export const mapPrismaActivityToActivity = (item: any): Activity => {
    let participantsCount = item.participantsCountPlanned || 0;
    if (item.reports) {
        const report = item.reports;
        if (report.participantsCountReported) {
            participantsCount = report.participantsCountReported;
        }
    }

    return {
        id: item.id,
        title: item.title,
        thematic: item.thematic,
        date: item.date ? item.date.toISOString() : '',
        level: item.level as Activity['level'],
        status: item.status as ActivityStatus,
        siteId: item.siteId || undefined,
        smallGroupId: item.smallGroupId || undefined,
        activityTypeId: item.activityTypeId,
        activityTypeEnum: item.activityTypeEnum || undefined,
        participantsCountPlanned: item.participantsCountPlanned || undefined,
        createdBy: item.createdById,
        createdAt: item.createdAt ? item.createdAt.toISOString() : '',
        siteName: item.site?.name,
        smallGroupName: item.smallGroup?.name,
        activityTypeName: item.activityType?.name,
        participantsCount: participantsCount,
    };
};

// ============================================
// QUERY BUILDERS
// ============================================

export function buildActivityWhereClause(filters: any) {
    const { user, searchTerm, dateFilter, statusFilter, levelFilter, isReportingContext } = filters;
    const where: any = {};

    // 1. apply RBAC
    const rbacClause = getRbacWhereClause(user);
    if (rbacClause) {
        Object.assign(where, rbacClause);
    }

    // 2. CONTEXTUAL ISOLATION: For reporting, strictly filter by role scope instead of just creator
    if (isReportingContext && user) {
        // Site Coordinator: Only reports for 'site' level activities in their site
        if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
            where.level = 'site';
            where.siteId = user.siteId;
        }
        // Small Group Leader: Only reports for their specific group
        else if (user.role === ROLES.SMALL_GROUP_LEADER && user.smallGroupId) {
            where.level = 'small_group';
            where.smallGroupId = user.smallGroupId;
        }
        // National Coordinator: Can report anything (usually national level)
        // If we want to be strict even for NC: where.level = 'national' if they select national? 
        // Actually NC usually only reports national ones themselves.
        else if (user.role === ROLES.NATIONAL_COORDINATOR) {
            // No extra level restriction, they see all via RBAC clause (which is null for NC -> all)
        }
        else {
            // For other roles or if IDs are missing, restrict to what they created as fallback
            where.createdById = user.id;
        }

        // 3. SERVER-SIDE TIMING: Activity must have started + 5h delay
        const REPORT_DELAY_HOURS = 5;
        const now = new Date();
        const delayMs = REPORT_DELAY_HOURS * 60 * 60 * 1000;
        const cutoffDate = new Date(now.getTime() - delayMs);

        // Mix with existing date filter if any
        if (where.date) {
            where.date.lte = where.date.lte
                ? new Date(Math.min(new Date(where.date.lte).getTime(), cutoffDate.getTime()))
                : cutoffDate;
        } else {
            where.date = { lte: cutoffDate };
        }
    }

    // 4. apply Search
    if (searchTerm) {
        where.title = { contains: searchTerm, mode: 'insensitive' };
    }

    // 5. apply Date (if not already handled or additional range provided)
    if (dateFilter?.from || dateFilter?.to) {
        if (!where.date) where.date = {};
        if (dateFilter.from) where.date.gte = dateFilter.from;
        if (dateFilter.to) {
            const requestedTo = new Date(dateFilter.to);
            where.date.lte = where.date.lte
                ? new Date(Math.min(new Date(where.date.lte).getTime(), requestedTo.getTime()))
                : requestedTo;
        }
    }

    // 6. apply Filters
    applyListFilter(where, 'status', statusFilter);
    applyListFilter(where, 'level', levelFilter);

    return where;
}

function getRbacWhereClause(user: any) {
    if (user.role === ROLES.SITE_COORDINATOR) {
        if (user.siteId) {
            return {
                OR: [
                    { level: 'national' },
                    { level: 'site', siteId: user.siteId },
                    { level: 'small_group', siteId: user.siteId }
                ]
            };
        }
        // Fallback: If no siteId, show only national (or nothing)
        return { level: 'national' };
    }

    if (user.role === ROLES.SMALL_GROUP_LEADER) {
        if (user.siteId && user.smallGroupId) {
            return {
                OR: [
                    { level: 'national' },
                    { level: 'site', siteId: user.siteId },
                    { level: 'small_group', smallGroupId: user.smallGroupId }
                ]
            };
        }
        // Fallback: If no group assigned, show only national
        return { level: 'national' };
    }

    return null;
}

function applyListFilter(where: any, field: string, filterObj: any) {
    if (!filterObj) return;

    const values = Object.entries(filterObj)
        .filter(([_, v]) => v)
        .map(([k]: [string, any]) => k);

    if (values.length > 0) {
        where[field] = { in: values };
    }
}

// ============================================
// VALIDATORS & GUARDS
// ============================================

export function validateUpdatePermissions(currentUser: any, existingActivity: any) {
    if (currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
        // Site Coordinator
        if (currentUser.role === ROLES.SITE_COORDINATOR) {
            if (existingActivity.siteId !== currentUser.siteId) {
                throw new Error('Forbidden: Cannot update activity from another site');
            }
        }
        // Small Group Leader
        else if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
            if (existingActivity.smallGroupId !== currentUser.smallGroupId) {
                throw new Error('Forbidden: Cannot update activity from another group');
            }
        }
        // Members
        else if (currentUser.role === ROLES.MEMBER) {
            throw new Error('Forbidden');
        }
    }
}

export function buildActivityUpdateData(updatedData: any, currentUser: any) {
    const dbUpdates: any = {};

    const fields = [
        'title', 'thematic', 'date', 'status',
        'activityTypeId', 'activityTypeEnum', 'participantsCountPlanned'
    ];

    fields.forEach((f: string) => {
        if (updatedData[f] !== undefined) dbUpdates[f] = updatedData[f];
    });

    if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
        if (updatedData.level !== undefined) dbUpdates.level = updatedData.level;
        if (updatedData.siteId !== undefined) dbUpdates.siteId = updatedData.siteId;
        if (updatedData.smallGroupId !== undefined) dbUpdates.smallGroupId = updatedData.smallGroupId;
    } else if (currentUser.role === ROLES.SITE_COORDINATOR) {
        if (updatedData.level !== undefined) dbUpdates.level = updatedData.level;
        if (updatedData.smallGroupId !== undefined) dbUpdates.smallGroupId = updatedData.smallGroupId;
    }

    return dbUpdates;
}

export async function validateAndPrepareCreateData(activityData: ActivityFormData, currentUser: any) {
    const safeData = { ...activityData } as any;
    safeData.createdBy = currentUser.id;

    if (currentUser.role === ROLES.MEMBER) {
        throw new Error('Unauthorized: Members cannot create activities');
    }

    enforceUserScope(safeData, currentUser);
    enforceLevelExclusivity(safeData);

    return safeData;
}

function enforceUserScope(safeData: any, currentUser: any) {
    if (currentUser.role === ROLES.SITE_COORDINATOR) {
        if (!currentUser.siteId) throw new Error('Site Coordinator has no site assigned');
        safeData.siteId = currentUser.siteId;
        if (safeData.level === 'small_group' && !safeData.smallGroupId) {
            safeData.level = 'site';
        }
    } else if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
        if (!currentUser.smallGroupId) throw new Error('Small Group Leader has no group assigned');
        safeData.level = 'small_group';
        safeData.smallGroupId = currentUser.smallGroupId;
        safeData.siteId = currentUser.siteId || undefined;
    }
}

function enforceLevelExclusivity(safeData: any) {
    if (safeData.level === 'national') {
        safeData.siteId = undefined;
        safeData.smallGroupId = undefined;
    } else if (safeData.level === 'site') {
        safeData.smallGroupId = undefined;
    }
}
