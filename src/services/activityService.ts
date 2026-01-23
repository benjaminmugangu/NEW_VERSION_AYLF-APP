'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Activity, ActivityStatus, ActivityType, ServiceResponse, ErrorCode } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { type ActivityFormData } from '@/schemas/activity';
import { revalidatePath } from 'next/cache';
import { notifyActivityCreated } from './notificationService';
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

// ==============================================================================
// DEDICATED USE-CASE: GET REPORTABLE ACTIVITIES
// Strict Server-Side Enforcement of:
// 1. Creator Only (Isolation)
// 2. 5-Hour Delay Rule
// 3. Uniqueness (No existing report)
// ==============================================================================
export const getReportableActivities = async (): Promise<ServiceResponse<Activity[]>> => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user || !user.id) {
      return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };
    }

    // Fetch full profile to get role and siteId/smallGroupId
    const { getProfile } = await import('./profileService');
    const profileResponse = await getProfile(user.id);
    if (!profileResponse.success || !profileResponse.data) {
      console.error(`[ActivityService] Could not fetch profile for user ${user.id}`);
      return { success: false, error: { message: 'Profile not found', code: ErrorCode.NOT_FOUND } };
    }
    const fullUser = profileResponse.data;

    const result = await withRLS(fullUser.id, async () => {
      // Use standardized query builder with reporting context
      const { buildActivityWhereClause } = await import('./activityUtils');
      const where = buildActivityWhereClause({
        user: fullUser,
        isReportingContext: true,
        statusFilter: { planned: true, in_progress: true, delayed: true }
      });

      console.log(`[DEBUG] getReportableActivities - User: ${fullUser.name} (${fullUser.id}), Role: ${fullUser.role}, Site: ${fullUser.siteId}, Group: ${fullUser.smallGroupId}`);
      console.log(`[DEBUG] getReportableActivities - Generated WHERE clause:`, JSON.stringify(where, null, 2));

      const activities = await prisma.activity.findMany({
        where: {
          ...where,
          reports: null // STRICT UNIQUENESS (1-to-1 relation)
        },
        include: {
          site: true,
          smallGroup: true,
          activityType: true,
          reports: {
            select: { participantsCountReported: true }
          }
        },
        orderBy: { date: 'desc' }
      });

      console.log(`[DEBUG] getReportableActivities - Found ${activities.length} activities.`);

      if (activities.length === 0) {
        // Diagnostic: Check for ANY activities in this site/owned by this user to narrow down the filter issue
        const siteCount = await prisma.activity.count({ where: { siteId: fullUser.siteId } });
        const ownedCount = await prisma.activity.count({ where: { createdById: fullUser.id } });
        console.log(`[DEBUG] Diagnostic - Site activities count: ${siteCount}, Owned activities count: ${ownedCount}`);
      }

      const { mapPrismaActivityToActivity } = await import('./activityUtils');
      return activities.map(mapPrismaActivityToActivity);
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error(`[ActivityService] getReportableActivities Error: ${error.message}`);
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
};

export const getFilteredActivities = async (filters: any): Promise<ServiceResponse<Activity[]>> => {
  try {
    const { user, limit, offset } = filters;
    if (!user) return { success: false, error: { message: 'User not authenticated.', code: ErrorCode.UNAUTHORIZED } };

    const result = await withRLS(user.id, async () => {
      console.log('[getFilteredActivities] Filters received:', JSON.stringify({ ...filters, user: { id: user.id, role: user.role } }, null, 2));
      const where = buildActivityWhereClause(filters);
      console.log('[getFilteredActivities] Generated WHERE:', JSON.stringify(where, null, 2));

      // 🛡️ SAFETY NET: Strict Isolation for Reporting
      // Ensure that under no circumstances can a user see activities they didn't create
      if (filters.isReportingContext && user?.id) {
        where.createdById = user.id;
      }

      const activities = await prisma.activity.findMany({
        where,
        include: {
          site: true,
          smallGroup: true,
          activityType: true,
          reports: {
            select: { participantsCountReported: true }
          }
        },
        take: limit ? Number(limit) : undefined,
        skip: offset ? Number(offset) : undefined,
        orderBy: { date: 'desc' }
      });

      return activities.map(mapPrismaActivityToActivity);
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
};

export const getActivityById = async (id: string): Promise<ServiceResponse<Activity>> => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const userId = user?.id || 'anonymous';

    const result = await withRLS(userId, async () => {
      const activity = await prisma.activity.findUnique({
        where: { id },
        include: {
          site: true,
          smallGroup: true,
          activityType: true,
          reports: {
            select: { participantsCountReported: true }
          }
        }
      });

      if (!activity) {
        throw new Error('NOT_FOUND: Activity not found');
      }

      return mapPrismaActivityToActivity(activity);
    });

    return { success: true, data: result };
  } catch (error: any) {
    let code = ErrorCode.INTERNAL_ERROR;
    if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
    return { success: false, error: { message: error.message, code } };
  }
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

    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const currentUser = await basePrisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, siteId: true, smallGroupId: true }
    });

    if (!currentUser) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

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
            await notifyActivityCreated(sc.id, activity.title, activity.id, tx);
          }
        }

        if (activity.smallGroupId && activity.level === 'small_group') {
          const group = await tx.smallGroup.findUnique({
            where: { id: activity.smallGroupId },
            select: { leaderId: true, siteId: true }
          });

          if (group?.leaderId && group.leaderId !== currentUser.id) {
            await notifyActivityCreated(group.leaderId, activity.title, activity.id, tx);
          }

          if (group?.siteId) {
            const sc = await tx.profile.findFirst({
              where: { siteId: group.siteId, role: ROLES.SITE_COORDINATOR }
            });
            if (sc && sc.id !== currentUser.id) {
              await notifyActivityCreated(sc.id, activity.title, activity.id, tx);
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
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
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

    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const currentUser = await basePrisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, siteId: true, smallGroupId: true }
    });

    if (!currentUser) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const result = await withRLS(currentUser.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${currentUser.id.replace(/'/g, "''")}'`);

        const before = await tx.activity.findUnique({
          where: { id },
          select: { siteId: true, smallGroupId: true, createdById: true }
        });

        if (!before) throw new Error('NOT_FOUND: Activity not found');

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
              select: { participantsCountReported: true }
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
    let code = ErrorCode.INTERNAL_ERROR;
    if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
    if (error.message.includes('Forbidden')) code = ErrorCode.FORBIDDEN;
    return { success: false, error: { message: error.message, code } };
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

    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const currentUser = await basePrisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, role: true, siteId: true, smallGroupId: true }
    });

    if (!currentUser) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    await withRLS(currentUser.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${currentUser.id.replace(/'/g, "''")}'`);

        const activity = await tx.activity.findUnique({
          where: { id },
          select: { siteId: true, smallGroupId: true }
        });

        if (!activity) throw new Error('NOT_FOUND: Activity not found');

        if (currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
          if (currentUser.role === ROLES.SITE_COORDINATOR) {
            if (activity.siteId !== currentUser.siteId) {
              throw new Error('FORBIDDEN: Cannot delete activity from another site');
            }
          } else if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
            if (activity.smallGroupId !== currentUser.smallGroupId) {
              throw new Error('FORBIDDEN: Cannot delete activity from another group');
            }
          } else {
            throw new Error('FORBIDDEN');
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
    let code = ErrorCode.INTERNAL_ERROR;
    if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
    if (error.message.includes('FORBIDDEN')) code = ErrorCode.FORBIDDEN;
    return { success: false, error: { message: error.message, code } };
  }
}

export const getActivityTypes = async (): Promise<ServiceResponse<ActivityType[]>> => {
  try {
    const types = await prisma.activityType.findMany();

    const data = types.map((t: any) => ({
      id: t.id,
      name: t.name,
      description: t.description || undefined,
      category: t.category,
    }));
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
};

export const updateActivityStatuses = async (): Promise<ServiceResponse<{ plannedToInProgress: number; inProgressToDelayed: number }>> => {
  try {
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
      success: true,
      data: {
        plannedToInProgress: plannedToInProgress.count,
        inProgressToDelayed: delayedCount,
      }
    };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
};
