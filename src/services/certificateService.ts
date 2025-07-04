// src/services/certificateService.ts
'use client';

import { mockUsers, mockSites, mockSmallGroups } from '@/lib/mockData';
import type { ServiceResponse, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { startOfDay, endOfDay, parseISO, isValid } from 'date-fns';

export interface CertificateRosterFilters {
  startDate: Date | null;
  endDate: Date | null;
}

export interface RosterMember extends User {
  entityName: string;
  roleDisplayName: string;
  mandateStatus: 'Active' | 'Past';
}

const getEntityName = (user: User): string => {
  if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
    return mockSites.find(s => s.id === user.siteId)?.name || 'Unknown Site';
  }
  if (user.role === ROLES.SMALL_GROUP_LEADER && user.smallGroupId) {
    const sg = mockSmallGroups.find(s => s.id === user.smallGroupId);
    if (sg) {
      const site = mockSites.find(s => s.id === sg.siteId);
      return `${sg.name}${site ? ` (${site.name})` : ''}`;
    }
    return 'Unknown Small Group';
  }
  return 'N/A';
};

const getRoleDisplayName = (role: User['role']) => {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const certificateService = {
  getCertificateRoster: async (filters: CertificateRosterFilters): Promise<ServiceResponse<RosterMember[]>> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    try {
      const { startDate, endDate } = filters;
      const now = new Date();

      const roster = mockUsers
        .filter(user => {
          const isLeaderOrCoordinator = user.role === ROLES.SITE_COORDINATOR || user.role === ROLES.SMALL_GROUP_LEADER;
          if (!isLeaderOrCoordinator || !user.mandateStartDate) return false;

          if (!startDate || !endDate) return true; // No date filter

          const mandateStart = parseISO(user.mandateStartDate);
          const mandateEnd = user.mandateEndDate ? parseISO(user.mandateEndDate) : now;

          if (!isValid(mandateStart) || !isValid(mandateEnd)) return false;

          // Check for overlap between mandate period and filter period
          return startOfDay(mandateStart) <= endOfDay(endDate) && endOfDay(mandateEnd) >= startOfDay(startDate);
        })
        .map((user): RosterMember => ({
          ...user,
          entityName: getEntityName(user),
          roleDisplayName: getRoleDisplayName(user.role),
          mandateStatus: user.mandateEndDate ? 'Past' : 'Active',
        }))
        .sort((a, b) => (a.mandateEndDate ? 1 : -1) - (b.mandateEndDate ? 1 : -1) || new Date(b.mandateStartDate || 0).getTime() - new Date(a.mandateStartDate || 0).getTime());

      return { success: true, data: roster };
    } catch (error) {
      console.error('Failed to fetch certificate roster:', error);
      return { success: false, error: 'Could not retrieve the roster.' };
    }
  },
};

export default certificateService;
