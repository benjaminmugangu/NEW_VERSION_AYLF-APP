import { supabase } from '@/lib/supabaseClient';
import type { ReportStatus, ReportWithDetails, ServiceResponse } from '@/lib/types';
import { getDateRangeFromFilterValue, type DateFilterValue } from '@/components/shared/DateRangeFilter';

// Helper to transform Supabase data into our application's data model
const toReportWithDetailsModel = (dbRecord: any): ReportWithDetails => {
  return {
    id: dbRecord.id,
    title: dbRecord.title,
    activityDate: dbRecord.activity_date,
    submittedBy: dbRecord.submitted_by,
    submissionDate: dbRecord.submission_date,
    level: dbRecord.level,
    siteId: dbRecord.site_id,
    smallGroupId: dbRecord.small_group_id,
    activityTypeId: dbRecord.activity_type_id,
    thematic: dbRecord.thematic,
    speaker: dbRecord.speaker,
    moderator: dbRecord.moderator,
    girlsCount: dbRecord.girls_count,
    boysCount: dbRecord.boys_count,
    participantsCountReported: dbRecord.participants_count_reported,
    totalExpenses: dbRecord.total_expenses,
    currency: dbRecord.currency,
    content: dbRecord.content,
    images: dbRecord.images,
    financialSummary: dbRecord.financial_summary,
    status: dbRecord.status,
    reviewNotes: dbRecord.review_notes,
    attachments: dbRecord.attachments,
    // Enriched data from joins
    submittedByName: dbRecord.profiles?.name || 'N/A',
    siteName: dbRecord.sites?.name || 'N/A',
    smallGroupName: dbRecord.small_groups?.name || 'N/A',
    activityTypeName: dbRecord.activity_types?.name || 'N/A',
  };
};

export const reportService = {
  async getReportsWithDetails(
    filters: {
      dateRange?: DateFilterValue;
      status?: ReportStatus;
      searchTerm?: string;
      siteId?: string;
      smallGroupId?: string;
    } = {}
  ): Promise<ServiceResponse<ReportWithDetails[]>> {
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          sites ( name ),
          small_groups ( name ),
          profiles ( name ),
          activity_types ( name )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      if (filters.smallGroupId) {
        query = query.eq('small_group_id', filters.smallGroupId);
      }
      if (filters.dateRange) {
        const { startDate, endDate } = getDateRangeFromFilterValue(filters.dateRange);
        if (startDate) {
          query = query.gte('submission_date', startDate.toISOString());
        }
        if (endDate) {
          query = query.lte('submission_date', endDate.toISOString());
        }
      }
      if (filters.searchTerm) {
        query = query.ilike('title', `%${filters.searchTerm}%`);
      }

      // Order by most recent
      query = query.order('submission_date', { ascending: false });

      const { data, error } = await query;

      if (error) {

        return { success: false, error: { message: error.message } };
      }

      const reports = data.map(toReportWithDetailsModel);

      return { success: true, data: reports };

    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, error: { message: `Could not retrieve reports: ${errorMessage}` } };
    }
  },
};
