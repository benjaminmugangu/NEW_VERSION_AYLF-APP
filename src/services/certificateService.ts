// src/services/certificateService.ts
'use client';

import type { User } from '@/lib/types';

export interface CertificateRosterFilters {
  startDate: Date | null;
  endDate: Date | null;
}

export interface RosterMember extends User {
  entityName: string;
  roleDisplayName: string;
  mandateStatus: 'Active' | 'Past';
}


export const certificateService = {
  getCertificateRoster: async (filters: CertificateRosterFilters): Promise<RosterMember[]> => {
    const { startDate, endDate } = filters;
    const params = new URLSearchParams();

    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }

    const response = await fetch(`/api/certificates/eligible-users?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to fetch certificate roster' }));
      throw new Error(errorData.details || errorData.error || 'Failed to fetch certificate roster');
    }

    return response.json();
  },
};


