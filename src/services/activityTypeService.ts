// src/services/activityTypeService.ts
'use server';

import { prisma, withRLS } from '@/lib/prisma';
import type { ActivityType, ServiceResponse } from '@/lib/types';
import { ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

/**
 * Fetches all available activity types from the database.
 */
export async function getAllActivityTypes(): Promise<ServiceResponse<ActivityType[]>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    // System-level data, but we still verify session for security
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const items = await prisma.activityType.findMany({
      orderBy: { name: 'asc' },
    });

    const data = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category as ActivityType['category'],
      description: item.description ?? undefined,
    }));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}

/**
 * Fetches a single activity type by its ID.
 */
export async function getActivityTypeById(id: string): Promise<ServiceResponse<ActivityType>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const item = await prisma.activityType.findUnique({
      where: { id },
    });

    if (!item) return { success: false, error: { message: 'Activity type not found.', code: ErrorCode.NOT_FOUND } };

    const data = {
      id: item.id,
      name: item.name,
      category: item.category as ActivityType['category'],
      description: item.description ?? undefined,
    };

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}
