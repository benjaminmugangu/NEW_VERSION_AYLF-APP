import { describe, it, expect } from 'vitest';
import { mapDbActivityToActivity, mapActivityFormDataToDb } from './mappers';
import type { Activity } from './types';
import type { Activity as DbActivity } from '@prisma/client';
import type { ActivityFormData } from '@/schemas/activity';

describe('Activity Mappers', () => {
  it('mapDbActivityToActivity should convert snake_case to camelCase', () => {
    const dbActivity: any = {
      id: 'activity-1',
      title: 'Test Activity',
      thematic: 'Test Thematic',
      date: new Date('2023-03-10T00:00:00.000Z'),
      level: 'site',
      status: 'planned',
      siteId: 'site-1',
      activityTypeId: 'type-1',
      participantsCountPlanned: 20,
      createdById: 'user-1',
      createdAt: new Date('2023-03-01T10:00:00.000Z'),
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

    const expectedDbActivity: any = {
      title: 'New Activity',
      thematic: 'New Thematic',
      date: new Date('2023-04-15T00:00:00.000Z'),
      level: 'small_group',
      smallGroupId: 'sg-1',
      activityTypeId: 'type-2',
    };

    const result = mapActivityFormDataToDb(activityFormData);
    expect(result).toEqual(expectedDbActivity);
  });
});
