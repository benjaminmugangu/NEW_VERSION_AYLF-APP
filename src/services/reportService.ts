// src/services/reportService.ts
import { supabase } from '@/lib/supabaseClient';
import type { Report, ReportWithDetails, ReportFormData, User } from '@/lib/types';
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
    totalExpenses: dbReport.total_expenses,
    currency: dbReport.currency,
    content: dbReport.content,
    images: dbReport.images,
    financialSummary: dbReport.financial_summary,
    status: dbReport.status,
    reviewNotes: dbReport.review_notes,
    attachments: dbReport.attachments,
  };
};

// Helper to convert frontend camelCase to DB snake_case
const fromReportFormData = (formData: Partial<ReportFormData>): object => {
  const dbData = {
    title: formData.title,
    activity_date: formData.activityDate,
    level: formData.level,
    site_id: formData.siteId,
    small_group_id: formData.smallGroupId,
    activity_type_id: formData.activityTypeId,
    activity_id: formData.activityId, // Map frontend camelCase to DB snake_case
    thematic: formData.thematic,
    speaker: formData.speaker,
    moderator: formData.moderator,
    girls_count: formData.girlsCount,
    boys_count: formData.boysCount,
    total_expenses: formData.totalExpenses,
    currency: formData.currency,
    content: formData.content,
    financial_summary: formData.financialSummary,
    images: formData.images,
    submitted_by: formData.submittedBy,
    status: formData.status,
    review_notes: formData.reviewNotes,
  };

  // Filter out undefined values to avoid inserting them as null
  return Object.fromEntries(Object.entries(dbData).filter(([, value]) => value !== undefined));
};

export interface ReportFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: DateFilterValue;
  statusFilter?: Record<Report['status'], boolean>;
}

const reportService = {
  getReportById: async (id: string): Promise<Report> => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        profiles:submitted_by(name),
        sites:site_id(name),
        small_groups:small_group_id(name),
        activity_types:activity_type_id(name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error('Report not found.');
    }
    return toReportModel(data);
  },

  createReport: async (reportData: ReportFormData): Promise<Report> => {
    const reportForDb = fromReportFormData(reportData);

    const { data, error } = await supabase
      .from('reports')
      .insert(reportForDb)
      .select(`
        *,
        profiles:submitted_by(name),
        sites:site_id(name),
        small_groups:small_group_id(name),
        activity_types:activity_type_id(name)
      `)
      .single();

    if (error) {
      console.error('[ReportService] Error in createReport:', error.message);
      throw new Error(error.message);
    }

    return toReportModel(data);
  },

  updateReport: async (reportId: string, updatedData: Partial<ReportFormData>): Promise<ReportWithDetails> => {
    const reportForDb = fromReportFormData(updatedData);

    const { data, error } = await supabase
      .from('reports')
      .update(reportForDb)
      .eq('id', reportId)
      .select(`
        *,
        profiles:submitted_by(name),
        sites:site_id(name),
        small_groups:small_group_id(name),
        activity_types:activity_type_id(name)
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return toReportModel(data) as ReportWithDetails;
  },

  deleteReport: async (id: string): Promise<void> => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  },
  getFilteredReports: async (filters: ReportFilters): Promise<ReportWithDetails[]> => {
    const { user, entity, searchTerm, dateFilter, statusFilter } = filters;
    if (!user && !entity) {
      throw new Error('User or entity is required to fetch reports.');
    }

    // Restore the joins but keep filters commented out for now.
    // Use standard left joins (default) instead of inner joins to prevent reports from being dropped
    // if a related entity (like site or small group) is null.
    let query = supabase.from('reports').select(`
      *,
      profiles:submitted_by(name),
      sites:site_id(name),
      small_groups:small_group_id(name),
      activity_types:activity_type_id(name)
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
            // This user is a site coordinator but has no site assigned.
            // Return empty array to prevent RLS error from fetching all reports.
            return [];
          }
          break;
        case ROLES.SMALL_GROUP_LEADER:
          if (user.smallGroupId) {
            query = query.eq('small_group_id', user.smallGroupId);
          } else {
            // This user is a small group leader but has no group assigned.
            // This user is a small group leader but has no group assigned.
            // Return empty array to prevent RLS error.
            return [];
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
      throw new Error(error.message);
    }

    // The mapping is now assumed to be correct based on the select statement
    return data.map(toReportModel) as ReportWithDetails[];
  },
};

export default reportService;
