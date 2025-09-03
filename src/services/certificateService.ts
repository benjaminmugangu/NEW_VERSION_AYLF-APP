// src/services/certificateService.ts
'use client';

import { createClient } from '@/utils/supabase/client';

const supabase = createClient();
import type { User, Site, SmallGroup } from '@/lib/types';

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
      throw new Error(error.message || 'Failed to fetch certificate roster.');
    }

    return data as RosterMember[];
  },
};


