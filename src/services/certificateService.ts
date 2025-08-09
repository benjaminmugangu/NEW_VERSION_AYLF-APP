// src/services/certificateService.ts
'use client';

import { supabase } from '@/lib/supabaseClient';
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
      const { startDate, endDate } = filters;

      const { data, error } = await supabase.rpc('get_certificate_roster', {
        start_date_filter: startDate ? startDate.toISOString().split('T')[0] : null,
        end_date_filter: endDate ? endDate.toISOString().split('T')[0] : null,
      });

      if (error) {
        console.error('[CertificateService] Error fetching certificate roster:', error.message);
        return { success: false, error: { message: error.message } };
      }

      // The data from RPC should match the RosterMember structure.
      // We might need to cast it to ensure type safety if RPC doesn't infer it perfectly.
      return { success: true, data: data as RosterMember[] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`[CertificateService] Failed to fetch roster: ${errorMessage}`);
      return { success: false, error: { message: `Failed to fetch roster: ${errorMessage}` } };
    }
  },
};


