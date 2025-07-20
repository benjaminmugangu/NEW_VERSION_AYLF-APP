// src/services/certificateService.ts
'use client';

import type { ServiceResponse, User, Site, SmallGroup } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { startOfDay, endOfDay, parseISO, isValid } from 'date-fns';
import { profileService } from "@/services/profileService";
import siteService from './siteService';
import smallGroupService from './smallGroupService';

export interface CertificateRosterFilters {
  startDate: Date | null;
  endDate: Date | null;
}

export interface RosterMember extends User {
  entityName: string;
  roleDisplayName: string;
  mandateStatus: 'Active' | 'Past';
}

const getRoleDisplayName = (role: User['role']) => {
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const certificateService = {
  getCertificateRoster: async (filters: CertificateRosterFilters): Promise<ServiceResponse<RosterMember[]>> => {
    try {
      // To fetch all data, we need a user with national coordinator role
      const adminUser: User = {
        id: 'admin-fetch', // Dummy ID for fetching
        role: ROLES.NATIONAL_COORDINATOR,
        name: 'Admin Fetcher',
        email: '',
      };

      const [usersResponse, sitesResponse, smallGroupsResponse] = await Promise.all([
        profileService.getUsers(),
        siteService.getFilteredSites({ user: adminUser }),
        smallGroupService.getFilteredSmallGroups({ user: adminUser }),
      ]);

      if (!usersResponse.success || !sitesResponse.success || !smallGroupsResponse.success) {
        const errorParts = [];
        if (!usersResponse.success) errorParts.push('users');
        if (!sitesResponse.success) errorParts.push('sites');
        if (!smallGroupsResponse.success) errorParts.push('small groups');
        const errorMessage = `Failed to fetch data for certificate roster: ${errorParts.join(', ')}.`;
        return { success: false, error: { message: errorMessage } };
      }

      const allUsers = usersResponse.data || [];
      const allSites = sitesResponse.data || [];
      const allSmallGroups = smallGroupsResponse.data || [];

      const getEntityName = (user: User, sites: Site[], smallGroups: SmallGroup[]): string => {
        if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
          return sites.find(s => s.id === user.siteId)?.name || 'Unknown Site';
        }
        if (user.role === ROLES.SMALL_GROUP_LEADER && user.smallGroupId) {
          const sg = smallGroups.find(s => s.id === user.smallGroupId);
          if (sg) {
            const site = sites.find(s => s.id === sg.siteId);
            return `${sg.name}${site ? ` (${site.name})` : ''}`;
          }
          return 'Unknown Small Group';
        }
        return 'N/A';
      };

      const { startDate, endDate } = filters;
      const now = new Date();

      const roster = allUsers
        .filter((user: User) => {
          const isLeaderOrCoordinator = user.role === ROLES.SITE_COORDINATOR || user.role === ROLES.SMALL_GROUP_LEADER;
          if (!isLeaderOrCoordinator || !user.mandateStartDate) return false;

          if (!startDate || !endDate) return true; // No date filter

          const mandateStart = parseISO(user.mandateStartDate);
          const mandateEnd = user.mandateEndDate ? parseISO(user.mandateEndDate) : now;

          if (!isValid(mandateStart) || !isValid(mandateEnd)) return false;

          // Check for overlap between mandate period and filter period
          return startOfDay(mandateStart) <= endOfDay(endDate) && endOfDay(mandateEnd) >= startOfDay(startDate);
        })
        .map((user: User): RosterMember => ({
          ...user,
          entityName: getEntityName(user, allSites, allSmallGroups),
          roleDisplayName: getRoleDisplayName(user.role),
          mandateStatus: user.mandateEndDate ? 'Past' : 'Active',
        }))
        .sort((a: RosterMember, b: RosterMember) => (a.mandateEndDate ? 1 : -1) - (b.mandateEndDate ? 1 : -1) || new Date(b.mandateStartDate || 0).getTime() - new Date(a.mandateStartDate || 0).getTime());

      return { success: true, data: roster };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

      return { success: false, error: { message: `Could not retrieve the roster: ${errorMessage}` } };
    }
  },
};


