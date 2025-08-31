import { describe, it, expect } from 'vitest';
import { mapDbActivityToActivity, mapActivityFormDataToDb } from './mappers';
import type { DbActivity, Activity } from './types';
import type { ActivityFormData } from '@/services/activityService';

describe('Activity Mappers', () => {
  it('mapDbActivityToActivity should convert snake_case to camelCase', () => {
    const dbActivity: DbActivity = {
      id: 'activity-1',
      title: 'Test Activity',
      thematic: 'Test Thematic',
      date: '2023-03-10T00:00:00.000Z',
      level: 'site',
      status: 'planned',
      site_id: 'site-1',
      activity_type_id: 'type-1',
      participants_count_planned: 20,
      created_by: 'user-1',
      created_at: '2023-03-01T10:00:00.000Z',
    };

    const expectedActivity: Activity = {
      id: 'activity-1',
      title: 'Test Activity',
      thematic: 'Test Thematic',
      date: '2023-03-10T00:00:00.000Z',
      level: 'site',
      status: 'planned',
      siteId: 'site-1',
      activityTypeId: 'type-1',
      participantsCountPlanned: 20,
      createdBy: 'user-1',
      createdAt: '2023-03-01T10:00:00.000Z',
    };

    const result = mapDbActivityToActivity(dbActivity);
    expect(result).toEqual(expectedActivity);
  });

  it('mapActivityFormDataToDb should convert camelCase to snake_case', () => {
    const activityFormData: Partial<ActivityFormData> = {
      title: 'New Activity',
      thematic: 'New Thematic',
      date: new Date('2023-04-15T00:00:00.000Z'),
      level: 'small_group',
      smallGroupId: 'sg-1',
      activityTypeId: 'type-2',
    };

    const expectedDbActivity: Partial<DbActivity> = {
      title: 'New Activity',
      thematic: 'New Thematic',
      date: '2023-04-15T00:00:00.000Z',
      level: 'small_group',
      small_group_id: 'sg-1',
      activity_type_id: 'type-2',
    };

    const result = mapActivityFormDataToDb(activityFormData);
    expect(result).toEqual(expectedDbActivity);
  });
});
