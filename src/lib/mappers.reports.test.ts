import { describe, it, expect } from 'vitest';
import { mapDbReportToReport, mapReportFormDataToDb } from './mappers';
import type { DbReport, Report, ReportFormData } from './types';

describe('Report Mappers', () => {
  it('mapDbReportToReport should convert snake_case to camelCase and handle nulls', () => {
        const dbReport: DbReport = {
      id: 'report-1',
      title: 'Test Report',
      activity_date: '2023-01-15T00:00:00.000Z',
      submitted_by: 'user-1',
      submission_date: '2023-01-15T10:00:00.000Z',
      level: 'small_group',
      small_group_id: 'sg-1',
      site_id: 'site-1',
      activity_type_id: 'type-1',
      thematic: 'Test Thematic',
      participants_count_reported: 10,
      content: 'A great meeting.',
      status: 'submitted',
    };

        const expectedReport: Report = {
      id: 'report-1',
      title: 'Test Report',
      activityDate: '2023-01-15T00:00:00.000Z',
      submittedBy: 'user-1',
      submissionDate: '2023-01-15T10:00:00.000Z',
      level: 'small_group',
      smallGroupId: 'sg-1',
      siteId: 'site-1',
      activityTypeId: 'type-1',
      thematic: 'Test Thematic',
      participantsCountReported: 10,
      content: 'A great meeting.',
      status: 'submitted',
    };

    const result = mapDbReportToReport(dbReport);
    expect(result).toEqual(expectedReport);

    // Test with null values
        const dbReportWithNulls: DbReport = {
      ...dbReport,
      review_notes: undefined,
      speaker: undefined,
    };
        const expectedReportWithNulls: Report = {
      ...expectedReport,
      reviewNotes: undefined,
      speaker: undefined,
    };
    const resultWithNulls = mapDbReportToReport(dbReportWithNulls);
    expect(resultWithNulls).toEqual(expectedReportWithNulls);
  });

        it('mapReportFormDataToDb should convert camelCase to snake_case', () => {
        const report: Partial<ReportFormData> = {
      activityDate: '2023-02-01T00:00:00.000Z',
      smallGroupId: 'sg-2',
      participantsCountReported: 15,
    };

        const expectedDbReport: Partial<DbReport> = {
      activity_date: '2023-02-01T00:00:00.000Z',
      small_group_id: 'sg-2',
      participants_count_reported: 15,
    };

          const result = mapReportFormDataToDb(report);
    expect(result).toEqual(expectedDbReport);
  });
});
