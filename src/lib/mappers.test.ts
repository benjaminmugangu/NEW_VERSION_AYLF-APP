import { describe, it, expect } from 'vitest';
import { mapDbUserToUser, mapUserToDb } from './mappers';
import type { User } from './types';
import type { Profile } from '@prisma/client';

describe('User Mappers', () => {
  it('mapDbUserToUser should convert snake_case to camelCase', () => {
    const dbUser: Profile = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'SITE_COORDINATOR',
      status: 'active',
      siteId: 'site-1',
      smallGroupId: 'sg-1',
      mandateStartDate: new Date('2023-01-01T00:00:00.000Z'),
      mandateEndDate: new Date('2024-01-01T00:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const expectedUser: User = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'SITE_COORDINATOR',
      status: 'active',
      siteId: 'site-1',
      smallGroupId: 'sg-1',
      mandateStartDate: '2023-01-01T00:00:00.000Z',
      mandateEndDate: '2024-01-01T00:00:00.000Z',
    };

    const result = mapDbUserToUser(dbUser);
    expect(result).toEqual(expect.objectContaining(expectedUser));
  });

  it('mapUserToDb should convert camelCase to Date objects for database', () => {
    const userUpdate: Partial<User> = {
      name: 'Jane Doe',
      mandateStartDate: '2023-02-01T00:00:00.000Z',
    };

    const result = mapUserToDb(userUpdate);
    expect(result.name).toBe('Jane Doe');
    expect(result.mandateStartDate).toBeInstanceOf(Date);
  });
});
