// src/services/reportService.ts
import { createClient } from '@/utils/supabase/client';
import type { Report, ReportWithDetails, ReportFormData, User, DbReport } from '@/lib/types';
import { mapDbReportToReport, mapReportFormDataToDb } from '@/lib/mappers';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';

const supabase = createClient();

export interface ReportFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: DateFilterValue;
  statusFilter?: Record<Report['status'], boolean>;
}

const reportService = {
  async getReportById(id: string): Promise<Report> {
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
      const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
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
        ...(dbReport as DbReport),
        submittedByName: (dbReport as any).profiles?.name,
        siteName: (dbReport as any).sites?.name,
        smallGroupName: (dbReport as any).small_groups?.name,
        activityTypeName: (dbReport as any).activity_types?.name,
      };
      return mapDbReportToReport(dbReportWithRelations as any);
    }) as ReportWithDetails[];
  },
};

export { reportService };
