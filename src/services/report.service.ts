// src/services/report.service.ts
import { mockActivityTypes, mockReports, mockSites, mockSmallGroups, mockUsers } from '@/lib/mockData';
import type { ActivityType, Report, ReportStatus, ReportWithDetails, ServiceResponse, User } from '@/lib/types';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';

const reportService = {
  async getReportsWithDetails(
    filters: {
      dateRange?: DateFilterValue;
      status?: ReportStatus;
      searchTerm?: string;
      siteId?: string;
      smallGroupId?: string;
    } = {}
  ): Promise<ServiceResponse<ReportWithDetails[]>> {
    console.log("Fetching reports with details and filters:", filters);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

    try {
      let reports: Report[] = mockReports;

      // Apply status, site, and small group filters first for efficiency
      if (filters.status) {
        reports = reports.filter((report) => report.status === filters.status);
      }
      if (filters.siteId) {
        reports = reports.filter((report) => report.siteId === filters.siteId);
      }
      if (filters.smallGroupId) {
        reports = reports.filter((report) => report.smallGroupId === filters.smallGroupId);
      }

      // Apply date filter
      if (filters.dateRange) {
        reports = applyDateFilter(
          reports.map((r) => ({ ...r, date: r.submissionDate })),
          filters.dateRange
        );
      }

      // Enrich reports with details from other mock data sources
      const reportsWithDetails: ReportWithDetails[] = reports.map((report) => {
        const site = mockSites.find((s) => s.id === report.siteId);
        const smallGroup = mockSmallGroups.find(
          (sg) => sg.id === report.smallGroupId
        );
        const submittedByUser = mockUsers.find((u) => u.id === report.submittedBy);
        const activityType = mockActivityTypes.find(
          (at: ActivityType) => at.id === report.activityTypeId
        );
        return {
          ...report,
          site,
          smallGroup,
          submittedByUser,
          activityType,
        };
      });

      // Apply search term filter to the enriched data
      let filteredAndEnrichedReports = reportsWithDetails;
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredAndEnrichedReports = reportsWithDetails.filter(
          (r) =>
            r.title.toLowerCase().includes(term) ||
            r.site?.name.toLowerCase().includes(term) ||
            r.smallGroup?.name.toLowerCase().includes(term) ||
            r.submittedByUser?.name.toLowerCase().includes(term) ||
            r.activityType?.name.toLowerCase().includes(term)
        );
      }

      return { success: true, data: filteredAndEnrichedReports };
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return {
        success: false,
        error: `Could not retrieve reports: ${errorMessage}`,
      };
    }
  },
};

export default reportService;
