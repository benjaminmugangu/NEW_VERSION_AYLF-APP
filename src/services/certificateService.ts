// src/services/certificateService.ts
'use client';

import { supabase } from '@/lib/supabaseClient';
import type { User, Site, SmallGroup } from '@/lib/types';
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
  getCertificateRoster: async (filters: CertificateRosterFilters): Promise<RosterMember[]> => {
    const { startDate, endDate } = filters;

    const { data, error } = await supabase.rpc('get_certificate_roster', {
      start_date_filter: startDate ? startDate.toISOString().split('T')[0] : null,
      end_date_filter: endDate ? endDate.toISOString().split('T')[0] : null,
    });

    if (error) {
      console.error('[CertificateService] Error fetching certificate roster:', error.message);
      throw new Error(error.message);
    }

    // The data from RPC should match the RosterMember structure.
    return data as RosterMember[];
  },
};


