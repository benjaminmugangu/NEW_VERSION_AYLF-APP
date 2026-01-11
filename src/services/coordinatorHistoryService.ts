'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export type EntityType = 'national' | 'site' | 'small_group';

export interface CoordinatorHistory {
    id: string;
    name: string;
    email: string;
    role: string;
    entityType: EntityType;
    entityName: string;
    mandateStartDate: Date;
    mandateEndDate: Date | null;
    isActive: boolean;
    duration?: string;
}

/**
 * Get all coordinator history
 */
export async function getCoordinatorHistory(filters?: {
    entityType?: EntityType;
    siteId?: string;
    smallGroupId?: string;
    includeActive?: boolean;
    includePast?: boolean;
}): Promise<ServiceResponse<CoordinatorHistory[]>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            const where: any = {
                role: {
                    in: ['NATIONAL_COORDINATOR', 'SITE_COORDINATOR', 'SMALL_GROUP_LEADER']
                }
            };

            if (filters?.entityType === 'site') {
                where.role = 'SITE_COORDINATOR';
                if (filters.siteId) where.siteId = filters.siteId;
            } else if (filters?.entityType === 'small_group') {
                where.role = 'SMALL_GROUP_LEADER';
                if (filters.smallGroupId) where.smallGroupId = filters.smallGroupId;
            } else if (filters?.entityType === 'national') {
                where.role = 'NATIONAL_COORDINATOR';
            }

            if (filters?.includeActive && !filters?.includePast) {
                where.mandateEndDate = null;
            } else if (!filters?.includeActive && filters?.includePast) {
                where.mandateEndDate = { not: null };
            }

            const profiles = await prisma.profile.findMany({
                where,
                include: {
                    site: true,
                    smallGroup: {
                        include: { site: true }
                    }
                },
                orderBy: [
                    { mandateEndDate: 'desc' },
                    { mandateStartDate: 'desc' }
                ]
            });

            return profiles.map((p: any) => {
                const entityType = resolveEntityType(p.role);
                const entityName = resolveEntityName(p);

                return {
                    id: p.id,
                    name: p.name,
                    email: p.email,
                    role: p.role,
                    entityType,
                    entityName,
                    mandateStartDate: p.mandateStartDate!,
                    mandateEndDate: p.mandateEndDate,
                    isActive: p.mandateEndDate === null,
                    duration: calculateDuration(p.mandateStartDate, p.mandateEndDate)
                };
            });
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

function resolveEntityType(role: string): EntityType {
    if (role === 'NATIONAL_COORDINATOR') return 'national';
    if (role === 'SITE_COORDINATOR') return 'site';
    return 'small_group';
}

function resolveEntityName(p: any): string {
    if (p.role === 'NATIONAL_COORDINATOR') return 'National';
    if (p.role === 'SITE_COORDINATOR') return p.site?.name || 'N/A';
    return p.smallGroup ? `${p.smallGroup.name} (${p.smallGroup.site?.name || 'N/A'})` : 'N/A';
}

function calculateDuration(start: Date | null, end: Date | null): string {
    if (!start) return 'Date non définie';

    const endDate = end || new Date();
    const diffMs = endDate.getTime() - start.getTime();
    const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

    if (years > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
    return `${months} mois`;
}
