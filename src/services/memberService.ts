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

    // Role-based filtering
    switch (user.role) {
      case 'national_coordinator':
        // No additional filters needed
        break;
      case 'site_coordinator':
        if (!user.siteId) {
          return { success: true, data: [] }; // Return empty array if no siteId
        }
        query = query.eq('site_id', user.siteId);
        break;
      case 'small_group_leader':
        if (!user.smallGroupId) {
          return { success: true, data: [] }; // Return empty array if no smallGroupId
        }
        query = query.eq('small_group_id', user.smallGroupId);
        break;
      default:
        // For members or any other roles, return no data
        return { success: true, data: [] };
    }

    // Filter by small group if provided (for drilling down)
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
      siteName: member.site[0]?.name || 'N/A',
      smallGroupName: member.small_group[0]?.name || 'N/A',
    }));

    return { success: true, data: membersWithDetails };

  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error: { message: error } };
  }
};

const getMemberById = async (memberId: string): Promise<ServiceResponse<MemberWithDetails>> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select(`
        id, name, gender, type, join_date, phone, email, site_id, small_group_id, user_id,
        site:sites(name),
        small_group:small_groups(name)
      `)
      .eq('id', memberId)
      .single();

    if (error) {
      return { success: false, error: { message: `Member with id ${memberId} not found.` } };
    }

    const memberWithDetails: MemberWithDetails = {
      id: data.id,
      name: data.name,
      gender: data.gender,
      type: data.type,
      joinDate: data.join_date,
      phone: data.phone,
      email: data.email,
      siteId: data.site_id,
      smallGroupId: data.small_group_id,
      userId: data.user_id,
      siteName: data.site[0]?.name || 'N/A',
      smallGroupName: data.small_group[0]?.name || 'N/A',
    };

    return { success: true, data: memberWithDetails };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error: { message: error } };
  }
};

const updateMember = async (memberId: string, formData: any): Promise<ServiceResponse<Member>> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .update({
        name: formData.name,
        gender: formData.gender,
        type: formData.type,
        join_date: formData.joinDate,
        phone: formData.phone,
        email: formData.email,
        site_id: formData.siteId,
        small_group_id: formData.smallGroupId,
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, data };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error: { message: error } };
  }
};

const deleteMember = async (memberId: string): Promise<ServiceResponse<null>> => {
  try {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, data: null };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error: { message: error } };
  }
};

export const memberService = {
  getFilteredMembers,
  getMemberById,
  updateMember,
  deleteMember,
};




