// src/services/memberService.ts
'use client';

import { supabase } from '@/lib/supabaseClient';
import type { ServiceResponse, User, Member, MemberWithDetails } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';

export interface MemberFilters {
  user: User | null;
  searchTerm?: string;
  smallGroupId?: string;
  dateFilter?: DateFilterValue;
  typeFilter?: Record<Member['type'], boolean>;
}

const getFilteredMembers = async (filters: MemberFilters): Promise<ServiceResponse<MemberWithDetails[]>> => {
  const { user, searchTerm, dateFilter, typeFilter, smallGroupId } = filters;

  if (!user) {
    return { success: false, error: { message: 'Authentication required.' } };
  }

  try {
    let query = supabase
      .from('members')
      .select(`
        id,
        name,
        gender,
        type,
        join_date,
        phone,
        email,
        site_id,
        small_group_id,
        user_id,
        site:sites(name),
        small_group:small_groups(name)
      `);

    // Filter by small group if provided
    if (smallGroupId) {
      query = query.eq('small_group_id', smallGroupId);
    }

    // Filter by date range using the helper function
    if (dateFilter) {
      const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
      if (startDate) {
        query = query.gte('join_date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('join_date', endDate.toISOString());
      }
    }

    // Filter by member type
    const activeTypeFilters = typeFilter ? Object.entries(typeFilter).filter(([, value]) => value).map(([key]) => key) : [];
    if (activeTypeFilters.length > 0) {
        query = query.in('type', activeTypeFilters);
    }

    // Filter by search term (on member name)
    if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching members from Supabase:', error);
      return { success: false, error: { message: error.message } };
    }

    // Transform the data to match the frontend's MemberWithDetails type
    const membersWithDetails: MemberWithDetails[] = data.map((member: any) => ({
      id: member.id,
      name: member.name,
      gender: member.gender,
      type: member.type,
      joinDate: member.join_date,
      phone: member.phone,
      email: member.email,
      siteId: member.site_id,
      smallGroupId: member.small_group_id,
      userId: member.user_id,
      siteName: member.site?.name || 'N/A',
      smallGroupName: member.small_group?.name || 'N/A',
    }));

    return { success: true, data: membersWithDetails };

  } catch (e) {
    console.error('An unexpected error occurred in getFilteredMembers:', e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error: { message: error } };
  }
};

const memberService = {
  getFilteredMembers,
};

export default memberService;


