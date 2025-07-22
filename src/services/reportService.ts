// src/services/reportService.ts
import { supabase } from '@/lib/supabaseClient';
import type { Report, ReportFormData, ServiceResponse, User } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';
import { ROLES } from '@/lib/constants';

// Helper to convert DB snake_case to frontend camelCase
const toReportModel = (dbReport: any): Report => {
  if (!dbReport) return {} as Report; // Guard against null/undefined input

  return {
    id: dbReport.id,
    title: dbReport.title,
    activityDate: dbReport.activity_date,
    submittedBy: dbReport.submitted_by,
    // Safely access joined data
    submittedByName: dbReport.profiles ? dbReport.profiles.name : 'N/A',
    submissionDate: dbReport.submission_date,
    level: dbReport.level,
    siteId: dbReport.site_id,
    siteName: dbReport.sites ? dbReport.sites.name : 'N/A',
    smallGroupId: dbReport.small_group_id,
    smallGroupName: dbReport.small_groups ? dbReport.small_groups.name : 'N/A',
    activityTypeId: dbReport.activity_type_id,
    activityTypeName: dbReport.activity_types ? dbReport.activity_types.name : 'N/A',
    thematic: dbReport.thematic,
    speaker: dbReport.speaker,
    moderator: dbReport.moderator,
    girlsCount: dbReport.girls_count,
    boysCount: dbReport.boys_count,
    participantsCountReported: dbReport.participants_count_reported,
    totalExpenses: dbReport.expenses,
    currency: dbReport.currency,
    content: dbReport.content,
    images: dbReport.images,
    financialSummary: dbReport.financial_summary,
    status: dbReport.status,
    reviewNotes: dbReport.review_notes,
    attachments: dbReport.attachments,
  };
};

export interface ReportFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: DateFilterValue;
  statusFilter?: Record<Report['status'], boolean>;
}

const reportService = {
  getReportById: async (id: string): Promise<ServiceResponse<Report>> => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        profiles:submitted_by!inner(name),
        sites:site_id!inner(name),
        small_groups:small_group_id!inner(name),
        activity_types:activity_type_id!inner(name)
      `)
      .eq('id', id)
      .single();

    if (error) {

      return { success: false, error: { message: 'Report not found.' } };
    }
    return { success: true, data: toReportModel(data) };
  },

  createReport: async (reportData: ReportFormData): Promise<ServiceResponse<Report>> => {
    const { data: insertData, error: insertError } = await supabase
      .from('reports')
      // The Supabase client automatically converts camelCase to snake_case.
      // Redundant manual mapping is removed.
      .insert({ ...reportData })
      .select('id')
      .single();

    if (insertError) {

      return { success: false, error: { message: insertError.message } };
    }

    return reportService.getReportById(insertData.id);
  },

  updateReport: async (reportId: string, updatedData: Partial<ReportFormData>): Promise<ServiceResponse<Report>> => {
    const { error: updateError } = await supabase
      .from('reports')
      // The Supabase client automatically converts camelCase to snake_case.
      // Redundant manual mapping is removed.
      .update({ ...updatedData })
      .eq('id', reportId);

    if (updateError) {

      return { success: false, error: { message: updateError.message } };
    }

    return reportService.getReportById(reportId);
  },

  deleteReport: async (id: string): Promise<ServiceResponse<{ id: string }>> => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) return { success: false, error: { message: error.message } };
    return { success: true, data: { id } };
  },
  getFilteredReports: async (filters: ReportFilters): Promise<ServiceResponse<Report[]>> => {
    const { user, entity, searchTerm, dateFilter, statusFilter } = filters;
    if (!user && !entity) return { success: false, error: { message: 'Authentication or entity required' } };

    // Restore the joins but keep filters commented out for now.
    let query = supabase.from('reports').select(`
      *,
      profiles:submitted_by!inner(name),
      sites:site_id!inner(name),
      small_groups:small_group_id!inner(name),
      activity_types:activity_type_id!inner(name)
    `);

    if (entity) {
      if (entity.type === 'site') {
        query = query.eq('site_id', entity.id);
      } else {
        query = query.eq('small_group_id', entity.id);
      }
    } else if (user) {
      // 1. Filter by user role for data security and to prevent RLS failures
      switch (user.role) {
        case ROLES.SITE_COORDINATOR:
          if (user.siteId) {
            query = query.eq('site_id', user.siteId);
          } else {
            // This user is a site coordinator but has no site assigned.
            // Return empty array to prevent RLS error from fetching all reports.
            return { success: true, data: [] };
          }
          break;
        case ROLES.SMALL_GROUP_LEADER:
          if (user.smallGroupId) {
            query = query.eq('small_group_id', user.smallGroupId);
          } else {
            // This user is a small group leader but has no group assigned.
            // Return empty array to prevent RLS error.
            return { success: true, data: [] };
          }
          break;
        // national_coordinator sees everything, so no additional filter is needed.
        case ROLES.NATIONAL_COORDINATOR:
        default:
          break;
      }
    }

    // 2. Date filter
    if (dateFilter) {
      const { startDate, endDate } = getDateRangeFromFilterValue(dateFilter);
      if (startDate) {
        query = query.gte('activity_date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('activity_date', endDate.toISOString());
      }
    }

    // 3. Search term filter
    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`);
    }

    // 4. Status filter
    if (statusFilter) {
      const activeStatuses = Object.entries(statusFilter)
        .filter(([, isActive]) => isActive)
        .map(([status]) => status);
      if (activeStatuses.length > 0) {
        query = query.in('status', activeStatuses);
      }
    }

    const { data, error } = await query.order('submission_date', { ascending: false });

    if (error) {

      return { success: false, error: { message: error.message } };
    }

    const reports = data.map(toReportModel);
    return { success: true, data: reports };
  },
};

export { reportService };
