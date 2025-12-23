'use server';

import { prisma } from '@/lib/prisma';

export interface CoordinatorHistory {
    id: string;
    name: string;
    email: string;
    role: string;
    entityType: 'national' | 'site' | 'small_group';
    entityName: string;
    mandateStartDate: Date;
    mandateEndDate: Date | null;
    isActive: boolean;
    duration?: string; // "2 ans 3 mois"
}

/**
 * Get all coordinator history (national level view)
 */
export async function getCoordinatorHistory(filters?: {
    entityType?: 'national' | 'site' | 'small_group';
    siteId?: string;
    smallGroupId?: string;
    includeActive?: boolean;
    includePast?: boolean;
}): Promise<CoordinatorHistory[]> {
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

    // Filter by active/past
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

    return profiles.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        entityType: p.role === 'NATIONAL_COORDINATOR' ? 'national' :
            p.role === 'SITE_COORDINATOR' ? 'site' : 'small_group',
        entityName: p.role === 'NATIONAL_COORDINATOR' ? 'National' :
            p.role === 'SITE_COORDINATOR' ? p.site?.name || 'N/A' :
                p.smallGroup ? `${p.smallGroup.name} (${p.smallGroup.site?.name})` : 'N/A',
        mandateStartDate: p.mandateStartDate!,
        mandateEndDate: p.mandateEndDate,
        isActive: p.mandateEndDate === null,
        duration: calculateDuration(p.mandateStartDate, p.mandateEndDate)
    }));
}

function calculateDuration(start: Date | null, end: Date | null): string {
    // Handle null start date
    if (!start) return 'Date non définie';

    const endDate = end || new Date();
    const diffMs = endDate.getTime() - start.getTime();
    const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

    if (years > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`;
    return `${months} mois`;
}
