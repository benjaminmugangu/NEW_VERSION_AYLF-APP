// src/services/certificateService.ts
'use server';

import { prisma } from '@/lib/prisma';

export interface CertificateRosterFilters {
  startDate: Date | null;
  endDate: Date | null;
}

export interface RosterMember {
  id: string;
  name: string;
  email: string;
  role: string;
  siteId: string | null;
  smallGroupId: string | null;
  mandateStartDate: Date | null;
  mandateEndDate: Date | null;
  status: string;
  createdAt: Date;
  entityName: string;
  roleDisplayName: string;
  mandateStatus: 'Active' | 'Past';
}

const getRoleDisplayName = (role: string) => {
  // Replace underscores with spaces, capitalize words, fix SG
  return role.replaceAll('_', ' ').replaceAll(/\b\w/g, l => l.toUpperCase()).replaceAll('Sg', 'SG');
};

export async function getCertificateRoster(filters: CertificateRosterFilters): Promise<RosterMember[]> {
  const { startDate, endDate } = filters;

  // Build where clause for date filtering
  const where: any = {
    role: {
      in: ['NATIONAL_COORDINATOR', 'SITE_COORDINATOR', 'SMALL_GROUP_LEADER']
    },
    mandateStartDate: {
      not: null
    }
  };

  // Add date range filtering if provided (using tstzrange overlap logic from RPC)
  if (startDate || endDate) {
    where.AND = [];

    // Range overlap: profile's mandate overlaps with the filter range
    // A profile overlaps if: NOT (profile_end < filter_start OR profile_start > filter_end)
    if (startDate) {
      // Profile must not end before filter starts
      where.AND.push({
        OR: [
          { mandateEndDate: null }, // Still active
          { mandateEndDate: { gte: startDate } } // Or ended after/on filter start
        ]
      });
    }

    if (endDate) {
      // Profile must not start after filter ends
      where.AND.push({
        mandateStartDate: { lte: endDate }
      });
    }
  }

  // Fetch profiles with related sites and small groups
  const profiles = await prisma.profile.findMany({
    where,
    include: {
      site: true,
      smallGroup: {
        include: {
          site: true
        }
      }
    },
    orderBy: [
      { mandateEndDate: 'asc' }, // Nulls last (active first)
      { mandateStartDate: 'desc' }
    ]
  });

  // Map profiles to RosterMember format
  const rosterMembers: RosterMember[] = (profiles as any[]).map(profile => {
    // Determine entity name based on role
    let entityName = 'N/A';
    if (profile.role === 'NATIONAL_COORDINATOR') {
      entityName = 'National';
    } else if (profile.role === 'SITE_COORDINATOR' && profile.site) {
      entityName = profile.site.name;
    } else if (profile.role === 'SMALL_GROUP_LEADER' && profile.smallGroup) {
      const siteName = profile.smallGroup.site?.name || 'Unknown Site';
      entityName = `${profile.smallGroup.name} (${siteName})`;
    }

    // Determine mandate status
    const mandateStatus: 'Active' | 'Past' = profile.mandateEndDate ? 'Past' : 'Active';

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      siteId: profile.siteId,
      smallGroupId: profile.smallGroupId,
      mandateStartDate: profile.mandateStartDate,
      mandateEndDate: profile.mandateEndDate,
      status: profile.status,
      createdAt: profile.createdAt,
      entityName,
      roleDisplayName: getRoleDisplayName(profile.role),
      mandateStatus,
    };
  });

  // Sort: Active first, then by start date desc
  return rosterMembers.sort((a, b) => {
    if (a.mandateStatus !== b.mandateStatus) {
      return a.mandateStatus === 'Active' ? -1 : 1;
    }
    const aStart = a.mandateStartDate?.getTime() || 0;
    const bStart = b.mandateStartDate?.getTime() || 0;
    return bStart - aStart;
  });
}
