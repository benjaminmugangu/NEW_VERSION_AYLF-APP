// src/services/certificateService.ts
'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

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
  return role.replaceAll('_', ' ').replaceAll(/\b\w/g, l => l.toUpperCase()).replaceAll('Sg', 'SG');
};

export async function getCertificateRoster(filters: CertificateRosterFilters): Promise<ServiceResponse<RosterMember[]>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const { startDate, endDate } = filters;

    const result = await withRLS(user.id, async () => {
      const where: any = {
        role: {
          in: ['NATIONAL_COORDINATOR', 'SITE_COORDINATOR', 'SMALL_GROUP_LEADER']
        },
        mandateStartDate: {
          not: null
        }
      };

      if (startDate || endDate) {
        where.AND = [];
        if (startDate) {
          where.AND.push({
            OR: [
              { mandateEndDate: null },
              { mandateEndDate: { gte: startDate } }
            ]
          });
        }

        if (endDate) {
          where.AND.push({
            mandateStartDate: { lte: endDate }
          });
        }
      }

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
          { mandateEndDate: 'asc' },
          { mandateStartDate: 'desc' }
        ]
      });

      const rosterMembers: RosterMember[] = (profiles as any[]).map(profile => {
        let entityName = 'N/A';
        if (profile.role === 'NATIONAL_COORDINATOR') {
          entityName = 'National';
        } else if (profile.role === 'SITE_COORDINATOR' && profile.site) {
          entityName = profile.site.name;
        } else if (profile.role === 'SMALL_GROUP_LEADER' && profile.smallGroup) {
          const siteName = profile.smallGroup.site?.name || 'Unknown Site';
          entityName = `${profile.smallGroup.name} (${siteName})`;
        }

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

      return rosterMembers.sort((a, b) => {
        if (a.mandateStatus !== b.mandateStatus) {
          return a.mandateStatus === 'Active' ? -1 : 1;
        }
        const aStart = a.mandateStartDate?.getTime() || 0;
        const bStart = b.mandateStartDate?.getTime() || 0;
        return bStart - aStart;
      });
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}
