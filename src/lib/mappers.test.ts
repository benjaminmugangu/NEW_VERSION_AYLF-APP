import { describe, it, expect } from 'vitest';
import { mapDbUserToUser, mapUserToDb } from './mappers';
import type { DbUser, User } from './types';

describe('User Mappers', () => {
  it('mapDbUserToUser should convert snake_case to camelCase', () => {
    const dbUser: DbUser = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'site_coordinator',
      status: 'active',
      site_id: 'site-1',
      small_group_id: 'sg-1',
      mandate_start_date: '2023-01-01T00:00:00.000Z',
      mandate_end_date: '2024-01-01T00:00:00.000Z',
    };

    const expectedUser: User = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'site_coordinator',
      status: 'active',
      siteId: 'site-1',
      smallGroupId: 'sg-1',
      mandateStartDate: '2023-01-01T00:00:00.000Z',
      mandateEndDate: '2024-01-01T00:00:00.000Z',
    };

    const result = mapDbUserToUser(dbUser);
    expect(result).toEqual(expect.objectContaining(expectedUser));
  });

  it('mapUserToDb should convert camelCase to snake_case', () => {
    const userUpdate: Partial<User> = {
      name: 'Jane Doe',
      siteId: 'site-2',
      mandateStartDate: '2023-02-01T00:00:00.000Z',
    };

    const expectedDbUser: Partial<DbUser> = {
      name: 'Jane Doe',
      site_id: 'site-2',
      mandate_start_date: '2023-02-01T00:00:00.000Z',
    };

    const result = mapUserToDb(userUpdate);
    expect(result).toEqual(expectedDbUser);
  });
});
