// src/services/activityTypeService.ts
'use server';

import { prisma } from '@/lib/prisma';
import type { ActivityType } from '@/lib/types';

/**
 * Fetches all available activity types from the database.
 * @returns A list of all activity types.
 */
export const getAllActivityTypes = async (): Promise<ActivityType[]> => {
  const items = await prisma.activityType.findMany({
    orderBy: { name: 'asc' },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category as ActivityType['category'],
    description: item.description ?? undefined,
  }));
};

/**
 * Fetches a single activity type by its ID.
 * @param id The ID of the activity type to fetch.
 * @returns The activity type or throws if not found.
 */
export const getActivityTypeById = async (id: string): Promise<ActivityType> => {
  const item = await prisma.activityType.findUnique({
    where: { id },
  });

  if (!item) {
    throw new Error('Activity type not found.');
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category as ActivityType['category'],
    description: item.description ?? undefined,
  };
};