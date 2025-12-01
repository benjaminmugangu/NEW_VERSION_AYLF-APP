import { describe, it, expect } from 'vitest';
import { mapDbSmallGroupToSmallGroup, mapSmallGroupFormDataToDb } from './mappers';
import type { DbSmallGroup, SmallGroup, DbUser } from './types';
import type { SmallGroupFormData } from '@/lib/types';

describe('SmallGroup Mappers', () => {
  it('mapDbSmallGroupToSmallGroup should convert snake_case to camelCase and handle relations', () => {
    const dbSmallGroup: any = {
      id: 'sg-1',
      name: 'Test Group',
      site_id: 'site-1',
      leader_id: 'user-leader',
      logistics_assistant_id: 'user-logistics',
      finance_assistant_id: 'user-finance',
      meeting_day: 'Monday',
      meeting_time: '18:00',
      meeting_location: 'Online',
      sites: { name: 'Test Site' },
      leader: { id: 'user-leader', name: 'Leader Name' },
      small_group_members: [{ count: 5 }],
    };

    const expectedSmallGroup: Partial<SmallGroup> = {
      id: 'sg-1',
      name: 'Test Group',
      siteId: 'site-1',
      leaderId: 'user-leader',
      logisticsAssistantId: 'user-logistics',
      financeAssistantId: 'user-finance',
      meetingDay: 'Monday',
      meetingTime: '18:00',
      meetingLocation: 'Online',
      siteName: 'Test Site',
      leaderName: 'Leader Name',
      memberCount: 5,
    };

    const result = mapDbSmallGroupToSmallGroup(dbSmallGroup);
    expect(result).toMatchObject(expectedSmallGroup);
    expect(result.leader).toBeDefined();
  });

  it('mapSmallGroupFormDataToDb should convert camelCase to snake_case', () => {
    const formData: SmallGroupFormData = {
      name: 'New Group',
      siteId: 'site-2',
      leaderId: 'new-leader',
      logisticsAssistantId: 'new-logistics',
      financeAssistantId: 'new-finance',
      meetingDay: 'Wednesday',
      meetingTime: '19:30',
      meetingLocation: 'Community Hall',
    };

    const expectedDbData: Partial<DbSmallGroup> = {
      name: 'New Group',
      site_id: 'site-2',
      leader_id: 'new-leader',
      logistics_assistant_id: 'new-logistics',
      finance_assistant_id: 'new-finance',
      meeting_day: 'Wednesday',
      meeting_time: '19:30',
      meeting_location: 'Community Hall',
    };

    const result = mapSmallGroupFormDataToDb(formData);
    expect(result).toEqual(expectedDbData);
  });

  it('mapDbSmallGroupToSmallGroup should handle missing optional relations', () => {
    const dbSmallGroup: DbSmallGroup = {
      id: 'sg-2',
      name: 'Minimal Group',
      site_id: 'site-1',
      leader_id: 'user-leader',
    };

    const expected: Partial<SmallGroup> = {
      id: 'sg-2',
      name: 'Minimal Group',
      siteId: 'site-1',
      leaderId: 'user-leader',
      siteName: undefined,
      leaderName: undefined,
      memberCount: 0,
      leader: undefined,
    };

    const result = mapDbSmallGroupToSmallGroup(dbSmallGroup);
    expect(result).toMatchObject(expected);
  });
});
