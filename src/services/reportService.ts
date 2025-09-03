// src/services/reportService.ts
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import type { Report, ReportWithDetails, ReportFormData, User, DbReport } from '@/lib/types';
import { mapDbReportToReport, mapReportFormDataToDb } from '@/lib/mappers';
import { ROLES } from '@/lib/constants';

// Select appropriate Supabase client for environment
const getSupabase = async () => {
  if (typeof window === 'undefined') {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }
  return createBrowserClient();
};

// Normalize Supabase JSON fields to expected shapes
const normalizeImages = (images: any): Array<{ name: string; url: string }> | undefined => {
  if (!images) return undefined;
  if (!Array.isArray(images)) return undefined;
  return images
    .map((it: any) => {
      const name = typeof it?.name === 'string' ? it.name : undefined;
      const url = typeof it?.url === 'string' ? it.url : undefined;
      if (name && url) return { name, url };
      return undefined;
    })
    .filter(Boolean) as Array<{ name: string; url: string }>;
};

const normalizeAttachments = (attachments: any): string[] | undefined => {
  if (!attachments) return undefined;
  if (!Array.isArray(attachments)) return undefined;
  return attachments.filter((x: any) => typeof x === 'string') as string[];
};

// Server-safe date filter (avoid importing client component)
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
      const diff = (day + 6) % 7; // Monday start
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

export interface ReportFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: ServerDateFilter;
  statusFilter?: Record<Report['status'], boolean>;
}

const reportService = {
  async getReportById(id: string): Promise<Report> {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('reports')
      .select('*, profiles:submitted_by(name), sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[ReportService] Error in getReportById:', error.message);
      throw new Error('Report not found.');
    }

    const dbReportWithRelations = {
      ...data,
      submittedByName: (data as any).profiles?.name,
      siteName: (data as any).sites?.name,
      smallGroupName: (data as any).small_groups?.name,
      activityTypeName: (data as any).activity_types?.name,
    };

    return mapDbReportToReport(dbReportWithRelations as any);
  },

  async createReport(reportData: ReportFormData): Promise<Report> {
    const reportForDb = mapReportFormDataToDb(reportData);

    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('reports')
      .insert(reportForDb)
      .select('*, profiles:submitted_by(name), sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)')
      .single();

    if (error) {
      console.error('[ReportService] Error in createReport:', error.message);
      throw new Error(error.message);
    }

    const dbReportWithRelations = {
      ...data,
      submittedByName: (data as any).profiles?.name,
      siteName: (data as any).sites?.name,
      smallGroupName: (data as any).small_groups?.name,
      activityTypeName: (data as any).activity_types?.name,
    };

    return mapDbReportToReport(dbReportWithRelations as any);
  },

  async updateReport(reportId: string, updatedData: Partial<ReportFormData>): Promise<ReportWithDetails> {
    const reportForDb = mapReportFormDataToDb(updatedData);

    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('reports')
      .update(reportForDb)
      .eq('id', reportId)
      .select('*, profiles:submitted_by(name), sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)')
      .single();

    if (error) {
      console.error('[ReportService] Error in updateReport:', error.message);
      throw new Error(error.message);
    }

    const dbReportWithRelations = {
      ...data,
      submittedByName: (data as any).profiles?.name,
      siteName: (data as any).sites?.name,
      smallGroupName: (data as any).small_groups?.name,
      activityTypeName: (data as any).activity_types?.name,
    };

    return mapDbReportToReport(dbReportWithRelations as any) as ReportWithDetails;
  },

  async deleteReport(id: string): Promise<void> {
    const supabase = await getSupabase();
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) {
      console.error('[ReportService] Error in deleteReport:', error.message);
      throw new Error(error.message);
    }
  },

  async getFilteredReports(filters: ReportFilters): Promise<ReportWithDetails[]> {
    const { user, entity, searchTerm, dateFilter, statusFilter } = filters;
    if (!user && !entity) {
      throw new Error('User or entity is required to fetch reports.');
    }

    const supabase = await getSupabase();
    let query = supabase.from('reports').select('*, profiles:submitted_by(name), sites:site_id(name), small_groups:small_group_id(name), activity_types:activity_type_id(name)');

    if (entity) {
      query = entity.type === 'site' ? query.eq('site_id', entity.id) : query.eq('small_group_id', entity.id);
    } else if (user) {
      switch (user.role) {
        case ROLES.SITE_COORDINATOR:
          if (user.siteId) query = query.eq('site_id', user.siteId);
          else return [];
          break;
        case ROLES.SMALL_GROUP_LEADER:
          if (user.smallGroupId) query = query.eq('small_group_id', user.smallGroupId);
          else return [];
          break;
      }
    }

    if (dateFilter) {
      const { startDate, endDate } = computeDateRange(dateFilter);
      if (startDate) query = query.gte('activity_date', startDate.toISOString());
      if (endDate) query = query.lte('activity_date', endDate.toISOString());
    }

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`);
    }

    if (statusFilter) {
      const activeStatuses = Object.entries(statusFilter).filter(([, isActive]) => isActive).map(([status]) => status);
      if (activeStatuses.length > 0) query = query.in('status', activeStatuses);
    }

    const { data, error } = await query.order('submission_date', { ascending: false });

    if (error) {
      console.error('[ReportService] Error in getFilteredReports:', error.message);
      throw new Error(error.message);
    }

    return data.map(dbReport => {
      const dbReportWithRelations = {
        ...dbReport,
        images: normalizeImages((dbReport as any).images),
        attachments: normalizeAttachments((dbReport as any).attachments),
        submittedByName: (dbReport as any).profiles?.name,
        siteName: (dbReport as any).sites?.name,
        smallGroupName: (dbReport as any).small_groups?.name,
        activityTypeName: (dbReport as any).activity_types?.name,
      } as any;
      return mapDbReportToReport(dbReportWithRelations as any);
    }) as ReportWithDetails[];
  },
};

export { reportService };
