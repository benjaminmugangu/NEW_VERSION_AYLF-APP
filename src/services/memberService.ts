// src/services/memberService.ts
import { createClient as createBrowserClient } from '@/utils/supabase/client';

// Select appropriate Supabase client for environment
const getSupabase = async () => {
  if (typeof window === 'undefined') {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }
  return createBrowserClient();
};
import type { User, Member, MemberWithDetails, MemberFormData } from '@/lib/types';

// Server-safe date filter definition (avoid importing client component module)
type ServerDateFilter = {
  rangeKey?: string;
  from?: Date;
  to?: Date;
};

const computeDateRange = (dateFilter?: ServerDateFilter): { startDate?: Date; endDate?: Date } => {
  if (!dateFilter) return {};
  if (dateFilter.from || dateFilter.to) return { startDate: dateFilter.from, endDate: dateFilter.to };
  const key = dateFilter.rangeKey;
  if (!key || key === 'all_time') return {};
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (key) {
    case 'today': {
      const s = startOfDay(now);
      const e = new Date(s);
      e.setDate(e.getDate() + 1);
      return { startDate: s, endDate: e };
    }
    case 'this_week': {
      const s = startOfDay(now);
      const day = s.getDay();
      const diff = (day + 6) % 7; // Monday as start
      s.setDate(s.getDate() - diff);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      return { startDate: s, endDate: e };
    }
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { startDate: s, endDate: e };
    }
    case 'last_30_days': {
      const e = startOfDay(now);
      const s = new Date(e);
      s.setDate(s.getDate() - 30);
      return { startDate: s, endDate: e };
    }
    case 'last_90_days': {
      const e = startOfDay(now);
      const s = new Date(e);
      s.setDate(s.getDate() - 90);
      return { startDate: s, endDate: e };
    }
    case 'this_year': {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear() + 1, 0, 1);
      return { startDate: s, endDate: e };
    }
    default:
      return {};
  }
};

export interface MemberFilters {
  user: User | null;
  searchTerm?: string;
  smallGroupId?: string;
  dateFilter?: ServerDateFilter;
  typeFilter?: Record<Member['type'], boolean>;
}

// Helpers to normalize DB row -> frontend types
const normalizeGender = (g: any): Member['gender'] => (g === 'female' ? 'female' : 'male');
const normalizeType = (t: any): Member['type'] => (t === 'non-student' ? 'non-student' : 'student');
const normalizeLevel = (l: any): Member['level'] => (l === 'site' || l === 'small_group' || l === 'national' ? l : 'national');

const mapRowToMemberBase = (m: any): Member => {
  const gender = normalizeGender(m.gender);
  const type = normalizeType(m.type);
  const level = normalizeLevel(m.level);
  const joinDate = m.join_date ?? new Date().toISOString().substring(0, 10);
  const siteId: string | null | undefined = m.site_id;
  if (!siteId) {
    throw new Error('Invalid member data: missing site_id');
  }
  return {
    id: m.id,
    name: m.name,
    gender,
    type,
    joinDate,
    phone: m.phone ?? undefined,
    email: m.email ?? undefined,
    level,
    siteId,
    smallGroupId: m.small_group_id ?? undefined,
    userId: m.user_id ?? undefined,
  };
};

const mapRowToMemberWithDetails = (m: any): MemberWithDetails => {
  const site = Array.isArray(m.sites) ? m.sites[0] : m.sites;
  const small_group = Array.isArray(m.small_groups) ? m.small_groups[0] : m.small_groups;
  const base = mapRowToMemberBase(m);
  return {
    ...base,
    siteName: site?.name || 'N/A',
    smallGroupName: small_group?.name || 'N/A',
  };
};

const getFilteredMembers = async (filters: MemberFilters): Promise<MemberWithDetails[]> => {
  const { user, searchTerm, dateFilter, typeFilter, smallGroupId } = filters;

  if (!user) {
    throw new Error('Authentication required.');
  }

  const supabase = await getSupabase();
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
    const { startDate, endDate } = computeDateRange(dateFilter);
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

  return data.map((m: any) => mapRowToMemberWithDetails(m));
};

const getMemberById = async (memberId: string): Promise<MemberWithDetails> => {
  const supabase = await getSupabase();
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
    ...mapRowToMemberBase(data),
    siteName: site?.name || 'N/A',
    smallGroupName: small_group?.name || 'N/A',
  };
};

const updateMember = async (memberId: string, formData: MemberFormData): Promise<Member> => {
  const supabase = await getSupabase();
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

  // Map DB row to strict Member
  return mapRowToMemberBase(data);
};

const deleteMember = async (memberId: string): Promise<void> => {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId);

  if (error) {
    throw new Error(error.message);
  }
};

const createMember = async (formData: MemberFormData): Promise<Member> => {
  const supabase = await getSupabase();
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

  return mapRowToMemberBase(data);
};

export const memberService = {
  createMember,
  getFilteredMembers,
  getMemberById,
  updateMember,
  deleteMember,
};
