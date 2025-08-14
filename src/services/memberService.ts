// src/services/memberService.ts
'use client';

import { supabase } from '@/lib/supabaseClient';
import type { User, Member, MemberWithDetails, MemberFormData } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';

export interface MemberFilters {
  user: User | null;
  searchTerm?: string;
  smallGroupId?: string;
  dateFilter?: DateFilterValue;
  typeFilter?: Record<Member['type'], boolean>;
}

const getFilteredMembers = async (filters: MemberFilters): Promise<MemberWithDetails[]> => {
  const { user, searchTerm, dateFilter, typeFilter, smallGroupId } = filters;

  if (!user) {
    throw new Error('Authentication required.');
  }

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
      level,
      site_id,
      small_group_id,
      user_id,
      sites(name),
      small_groups(name)
    `);

  if (smallGroupId) {
    query = query.eq('small_group_id', smallGroupId);
  }

  if (dateFilter) {
    const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
    if (startDate) {
      query = query.gte('join_date', startDate.toISOString().substring(0, 10));
    }
    if (endDate) {
      query = query.lte('join_date', endDate.toISOString().substring(0, 10));
    }
  }

  const activeTypeFilters = typeFilter ? Object.entries(typeFilter).filter(([, value]) => value).map(([key]) => key) : [];
  if (activeTypeFilters.length > 0) {
      query = query.in('type', activeTypeFilters);
  }

  if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data.map((m: any) => {
    const site = Array.isArray(m.sites) ? m.sites[0] : m.sites;
    const small_group = Array.isArray(m.small_groups) ? m.small_groups[0] : m.small_groups;
    return {
      id: m.id,
      name: m.name,
      gender: m.gender,
      type: m.type,
      joinDate: m.join_date,
      phone: m.phone,
      email: m.email,
      level: m.level,
      siteId: m.site_id,
      smallGroupId: m.small_group_id,
      userId: m.user_id,
      siteName: site?.name || 'N/A',
      smallGroupName: small_group?.name || 'N/A',
    };
  });
};

const getMemberById = async (memberId: string): Promise<MemberWithDetails> => {
  const { data, error } = await supabase
    .from('members')
    .select(`
      id, name, gender, type, join_date, phone, email, level, site_id, small_group_id, user_id,
      sites(name),
      small_groups(name)
    `)
    .eq('id', memberId)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Member not found.');
  }

  const site = Array.isArray(data.sites) ? data.sites[0] : data.sites;
  const small_group = Array.isArray(data.small_groups) ? data.small_groups[0] : data.small_groups;

  return {
    id: data.id,
    name: data.name,
    gender: data.gender,
    type: data.type,
    joinDate: data.join_date,
    phone: data.phone,
    email: data.email,
    level: data.level,
    siteId: data.site_id,
    smallGroupId: data.small_group_id,
    userId: data.user_id,
    siteName: site?.name || 'N/A',
    smallGroupName: small_group?.name || 'N/A',
  };
};

const updateMember = async (memberId: string, formData: MemberFormData): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .update({
      name: formData.name,
      gender: formData.gender,
      type: formData.type,
      join_date: new Date(formData.joinDate).toISOString().substring(0, 10),
      phone: formData.phone,
      email: formData.email,
      level: formData.level,
      site_id: formData.siteId,
      small_group_id: formData.smallGroupId,
    })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Failed to update member: Member not found or no changes made.');
  }

  return data;
};

const deleteMember = async (memberId: string): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId);

  if (error) {
    throw new Error(error.message);
  }
};

const createMember = async (formData: MemberFormData): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .insert({
      name: formData.name,
      gender: formData.gender,
      type: formData.type,
      join_date: new Date(formData.joinDate).toISOString().substring(0, 10),
      phone: formData.phone,
      email: formData.email,
      level: formData.level,
      site_id: formData.siteId,
      small_group_id: formData.smallGroupId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Failed to create member.');
  }

  return data;
};

export const memberService = {
  createMember,
  getFilteredMembers,
  getMemberById,
  updateMember,
  deleteMember,
};
