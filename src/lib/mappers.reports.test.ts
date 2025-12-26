import { describe, it, expect } from 'vitest';
import { mapDbReportToReport, mapReportFormDataToDb } from './mappers';
import type { Report, ReportFormData } from './types';
import type { Report as DbReport } from '@prisma/client';

describe('Report Mappers', () => {
  it('mapDbReportToReport should convert snake_case to camelCase and handle nulls', () => {
    const dbReport: any = {
      id: 'report-1',
      title: 'Test Report',
      activityDate: new Date('2023-01-15T00:00:00.000Z'),
      submittedById: 'user-1',
      submissionDate: new Date('2023-01-15T10:00:00.000Z'),
      level: 'small_group',
      smallGroupId: 'sg-1',
      siteId: 'site-1',
      activityTypeId: 'type-1',
      thematic: 'Test Thematic',
      participantsCountReported: 10,
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
    const dbReportWithNulls: any = {
      ...dbReport,
      reviewNotes: undefined,
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

    const expectedDbReport: any = {
      activityDate: new Date('2023-02-01T00:00:00.000Z'),
      smallGroupId: 'sg-2',
      participantsCountReported: 15,
    };

    const result = mapReportFormDataToDb(report);
    expect(result).toEqual(expectedDbReport);
  });
});
