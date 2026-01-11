'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Activity, ActivityStatus, ActivityType, ServiceResponse } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { type ActivityFormData } from '@/schemas/activity';
import { revalidatePath } from 'next/cache';
import notificationService from './notificationService';
import {
  logActivityCreation,
  logActivityUpdate,
  logActivityDeletion
} from './auditLogService';
import {
  mapPrismaActivityToActivity,
  buildActivityWhereClause,
  validateUpdatePermissions,
  buildActivityUpdateData,
  validateAndPrepareCreateData
} from './activityUtils';

export const getFilteredActivities = async (filters: any): Promise<Activity[]> => {
  const { user } = filters;
  if (!user) throw new Error('User not authenticated.');

  return await withRLS(user.id, async () => {
    const where = buildActivityWhereClause(filters);

    const activities = await prisma.activity.findMany({
      where,
      include: {
        site: true,
        smallGroup: true,
        activityType: true,
        reports: {
          select: { participantsCountReported: true },
          take: 1,
          orderBy: { submissionDate: 'desc' }
        }
      },
      orderBy: { date: 'desc' }
    });

    return activities.map(mapPrismaActivityToActivity);
  });
};

export const getActivityById = async (id: string): Promise<Activity> => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const userId = user?.id || 'anonymous';

  return await withRLS(userId, async () => {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        site: true,
        smallGroup: true,
        activityType: true,
        reports: {
          select: { participantsCountReported: true },
          take: 1,
          orderBy: { submissionDate: 'desc' }
        }
      }
    });

    if (!activity) {
      throw new Error('Activity not found');
    }

    return mapPrismaActivityToActivity(activity);
  });
};

export const createActivity = async (
  activityData: ActivityFormData,
  overrideUser?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<Activity>> => {
  try {
    const { getUser } = getKindeServerSession();
    const user = overrideUser || await getUser();

    if (!user) throw new Error('Unauthorized');

    const currentUser = await basePrisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, siteId: true, smallGroupId: true }
    });

    if (!currentUser) throw new Error('Unauthorized');

    const result = await withRLS(currentUser.id, async () => {
      const safeData = await validateAndPrepareCreateData(activityData, currentUser);

      return await basePrisma.$transaction(async (tx: any) => {
        // A. Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${currentUser.id.replace(/'/g, "''")}'`);

        const activity = await tx.activity.create({
          data: {
            title: safeData.title,
            thematic: safeData.thematic,
            date: safeData.date,
            level: safeData.level,
            status: safeData.status,
            siteId: safeData.siteId,
            smallGroupId: safeData.smallGroupId,
            activityTypeId: safeData.activityTypeId && safeData.activityTypeId !== '00000000-0000-0000-0000-000000000000'
              ? safeData.activityTypeId
              : (await tx.activityType.findFirst({ select: { id: true } }))?.id || '00000000-0000-0000-0000-000000000000',
            activityTypeEnum: safeData.activityTypeEnum,
            participantsCountPlanned: safeData.participantsCountPlanned,
            createdById: safeData.createdBy,
          },
          include: {
            site: true,
            smallGroup: true,
            activityType: true,
          }
        });

        // Audit Log
        await logActivityCreation(currentUser.id, activity.id, activity, ipAddress, userAgent, tx);

        // --- Notifications ---
        if (activity.siteId && activity.level === 'site') {
          const sc = await tx.profile.findFirst({
            where: { siteId: activity.siteId, role: ROLES.SITE_COORDINATOR }
          });
          if (sc && sc.id !== currentUser.id) {
            await notificationService.notifyActivityCreated(sc.id, activity.title, activity.id, tx);
          }
        }

        if (activity.smallGroupId && activity.level === 'small_group') {
          const group = await tx.smallGroup.findUnique({
            where: { id: activity.smallGroupId },
            select: { leaderId: true, siteId: true }
          });

          if (group?.leaderId && group.leaderId !== currentUser.id) {
            await notificationService.notifyActivityCreated(group.leaderId, activity.title, activity.id, tx);
          }

          if (group?.siteId) {
            const sc = await tx.profile.findFirst({
              where: { siteId: group.siteId, role: ROLES.SITE_COORDINATOR }
            });
            if (sc && sc.id !== currentUser.id) {
              await notificationService.notifyActivityCreated(sc.id, activity.title, activity.id, tx);
            }
          }
        }

        revalidatePath('/dashboard/activities');
        return mapPrismaActivityToActivity(activity);
      });
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[ActivityService] Create Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

export const updateActivity = async (
  id: string,
  updatedData: Partial<ActivityFormData | { status: ActivityStatus }>,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<Activity>> => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) throw new Error('Unauthorized');

    const currentUser = await basePrisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, siteId: true, smallGroupId: true }
    });

    if (!currentUser) throw new Error('Unauthorized');

    const result = await withRLS(currentUser.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${currentUser.id.replace(/'/g, "''")}'`);

        const before = await tx.activity.findUnique({
          where: { id },
          select: { siteId: true, smallGroupId: true, createdById: true }
        });

        if (!before) throw new Error('Activity not found');

        // Permission Check
        validateUpdatePermissions(currentUser, before);

        const dbUpdates = buildActivityUpdateData(updatedData, currentUser);

        const updated = await tx.activity.update({
          where: { id },
          data: dbUpdates,
          include: {
            site: true,
            smallGroup: true,
            activityType: true,
            reports: {
              select: { participantsCountReported: true },
              take: 1,
              orderBy: { submissionDate: 'desc' }
            }
          }
        });

        // Audit Log
        await logActivityUpdate(currentUser.id, id, before, updated, ipAddress, userAgent, tx);

        revalidatePath('/dashboard/activities');
        return mapPrismaActivityToActivity(updated);
      });
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[ActivityService] Update Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

export const deleteActivity = async (
  id: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<void>> => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) throw new Error('Unauthorized');

    const currentUser = await basePrisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, siteId: true, smallGroupId: true }
    });

    if (!currentUser) throw new Error('Unauthorized');

    await withRLS(currentUser.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${currentUser.id.replace(/'/g, "''")}'`);

        const activity = await tx.activity.findUnique({
          where: { id },
          select: { siteId: true, smallGroupId: true }
        });

        if (!activity) throw new Error('Activity not found');

        if (currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
          if (currentUser.role === ROLES.SITE_COORDINATOR) {
            if (activity.siteId !== currentUser.siteId) {
              throw new Error('Forbidden: Cannot delete activity from another site');
            }
          } else if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
            if (activity.smallGroupId !== currentUser.smallGroupId) {
              throw new Error('Forbidden: Cannot delete activity from another group');
            }
          } else {
            throw new Error('Forbidden');
          }
        }

        // Audit Log
        await logActivityDeletion(currentUser.id, id, activity, ipAddress, userAgent, tx);

        await tx.activity.delete({
          where: { id },
        });
      });
    });

    revalidatePath('/dashboard/activities');
    revalidatePath('/dashboard'); // Update metrics
    return { success: true };
  } catch (error: any) {
    console.error(`[ActivityService] Delete Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

export const getActivityTypes = async (): Promise<ActivityType[]> => {
  const types = await prisma.activityType.findMany();

  return types.map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description || undefined,
    category: t.category,
  }));
};

export const updateActivityStatuses = async () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // 1. Planned -> In Progress (if date is today or past)
  const plannedToInProgress = await prisma.activity.updateMany({
    where: {
      status: 'planned',
      date: { lte: now },
    },
    data: { status: 'in_progress' },
  });

  // 2. In Progress -> Delayed (if date < yesterday and no reports)
  const activitiesToDelay = await prisma.activity.findMany({
    where: {
      status: 'in_progress',
      date: { lt: yesterday },
      reports: { none: {} },
    },
    select: { id: true },
  });

  const delayedCount = activitiesToDelay.length;
  if (delayedCount > 0) {
    await prisma.activity.updateMany({
      where: { id: { in: activitiesToDelay.map((a: any) => a.id) } },
      data: { status: 'delayed' },
    });
  }

  return {
    plannedToInProgress: plannedToInProgress.count,
    inProgressToDelayed: delayedCount,
  };
};
