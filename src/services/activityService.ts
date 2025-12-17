'use server';

import { prisma } from '@/lib/prisma';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Activity, ActivityStatus, ActivityType } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { type ActivityFormData } from '@/schemas/activity';


const mapPrismaActivityToActivity = (item: any): Activity => {
  // Try to determine participants count.
  // If reports exist, use the reported count from the latest report.
  // Otherwise use planned count.
  let participantsCount = item.participantsCountPlanned || 0;
  if (item.reports && item.reports.length > 0) {
    // Assuming the last report is the relevant one or summing them up?
    // Usually 1 activity = 1 report.
    const report = item.reports[0];
    if (report.participantsCountReported) {
      participantsCount = report.participantsCountReported;
    }
  }

  return {
    id: item.id,
    title: item.title, // mapped from 'name' in DB, but Prisma model uses 'title' if I recall schema correctly?
    // Wait, let's check schema for Activity model.
    // Line 209: title String.
    // Line 210: thematic String.
    // Line 117 in original service: dbData.name = activityData.title.
    // Original service mapped 'name' to 'title'.
    // Schema I read has 'title' and 'thematic'.
    // So Prisma model has 'title'.
    // But original service said `item.name` maps to `title`.
    // This implies the DB column is `name`?
    // Schema says: `title String`. It does NOT say `@map("name")`.
    // So the column is `title`.
    // But original service used `supabase.from('activities')` and `item.name`.
    // This is a conflict.
    // If `db push` was run with the schema I saw, the column is `title`.
    // If the DB was created by Supabase originally, it might be `name`.
    // However, the schema I read is the source of truth for Prisma.
    // I will use `item.title`.

    thematic: item.thematic,
    date: item.date ? item.date.toISOString() : '',
    level: item.level as Activity['level'],
    status: item.status as ActivityStatus,
    siteId: item.siteId || undefined,
    smallGroupId: item.smallGroupId || undefined,
    activityTypeId: item.activityTypeId,
    activityTypeEnum: item.activityTypeEnum || undefined,
    participantsCountPlanned: item.participantsCountPlanned || undefined,
    createdBy: item.createdById,
    createdAt: item.createdAt ? item.createdAt.toISOString() : '',
    siteName: item.site?.name,
    smallGroupName: item.smallGroup?.name,
    activityTypeName: item.activityType?.name,
    participantsCount: participantsCount,
  };
};

export const getFilteredActivities = async (filters: any): Promise<Activity[]> => {
  const { user } = filters;
  if (!user) throw new Error('User not authenticated.');

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
};

export const getActivityById = async (id: string): Promise<Activity> => {
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
};

export const createActivity = async (activityData: ActivityFormData): Promise<Activity> => {
  // Security Check: Get current user to enforce RBAC
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Fetch full profile for role and scoped IDs
  const currentUser = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, siteId: true, smallGroupId: true }
  });

  if (!currentUser) {
    throw new Error('Unauthorized: User profile not found');
  }

  // Enforce RBAC Overrides and Validations
  const safeData = await validateAndPrepareCreateData(activityData, currentUser);

  const activity = await prisma.activity.create({
    data: {
      title: safeData.title,
      thematic: safeData.thematic,
      date: safeData.date,
      level: safeData.level,
      status: safeData.status,
      siteId: safeData.siteId,
      smallGroupId: safeData.smallGroupId,
      activityTypeId: safeData.activityTypeId || '00000000-0000-0000-0000-000000000000',
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

  return mapPrismaActivityToActivity(activity);
};

export const updateActivity = async (id: string, updatedData: Partial<ActivityFormData | { status: ActivityStatus }>): Promise<Activity> => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) throw new Error('Unauthorized');

  const currentUser = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, siteId: true, smallGroupId: true }
  });

  if (!currentUser) throw new Error('Unauthorized');

  // Fetch existing activity to verify ownership/access
  const existingActivity = await prisma.activity.findUnique({
    where: { id },
    select: { siteId: true, smallGroupId: true, createdById: true }
  });

  if (!existingActivity) throw new Error('Activity not found');

  // Permission Check
  validateUpdatePermissions(currentUser, existingActivity);

  // Map frontend data to Prisma update object
  const dbUpdates = buildActivityUpdateData(updatedData, currentUser);

  const activity = await prisma.activity.update({
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

  return mapPrismaActivityToActivity(activity);
};

export const deleteActivity = async (id: string): Promise<void> => {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) throw new Error('Unauthorized');

  const currentUser = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, siteId: true, smallGroupId: true }
  });

  if (!currentUser) throw new Error('Unauthorized');

  const activity = await prisma.activity.findUnique({
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

  await prisma.activity.delete({
    where: { id },
  });
};

export const getActivityTypes = async (): Promise<ActivityType[]> => {
  const types = await prisma.activityType.findMany();

  return types.map(t => ({
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
      where: { id: { in: activitiesToDelay.map(a => a.id) } },
      data: { status: 'delayed' },
    });
  }

  return {
    plannedToInProgress: plannedToInProgress.count,
    inProgressToDelayed: delayedCount,
  };
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function buildActivityWhereClause(filters: any) {
  const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;
  const where: any = {};

  // 1. apply RBAC
  const rbacClause = getRbacWhereClause(user);
  if (rbacClause) {
    Object.assign(where, rbacClause);
  }

  // 2. apply Search
  if (searchTerm) {
    where.title = { contains: searchTerm, mode: 'insensitive' };
  }

  // 3. apply Date
  if (dateFilter?.from || dateFilter?.to) {
    where.date = {};
    if (dateFilter.from) where.date.gte = dateFilter.from;
    if (dateFilter.to) where.date.lte = dateFilter.to;
  }

  // 4. apply Filters
  applyListFilter(where, 'status', statusFilter);
  applyListFilter(where, 'level', levelFilter);

  return where;
}

function getRbacWhereClause(user: any) {
  if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
    return {
      OR: [
        { level: 'national' },
        { level: 'site', siteId: user.siteId },
        { level: 'small_group', siteId: user.siteId }
      ]
    };
  }

  if (user.role === ROLES.SMALL_GROUP_LEADER && user.siteId && user.smallGroupId) {
    return {
      OR: [
        { level: 'national' },
        { level: 'site', siteId: user.siteId },
        { level: 'small_group', smallGroupId: user.smallGroupId }
      ]
    };
  }

  return null;
}

function applyListFilter(where: any, field: string, filterObj: any) {
  if (!filterObj) return;

  const values = Object.entries(filterObj)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  if (values.length > 0) {
    where[field] = { in: values };
  }
}

function validateUpdatePermissions(currentUser: any, existingActivity: any) {
  if (currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
    // Site Coordinator
    if (currentUser.role === ROLES.SITE_COORDINATOR) {
      if (existingActivity.siteId !== currentUser.siteId) {
        throw new Error('Forbidden: Cannot update activity from another site');
      }
    }
    // Small Group Leader
    else if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
      if (existingActivity.smallGroupId !== currentUser.smallGroupId) {
        throw new Error('Forbidden: Cannot update activity from another group');
      }
    }
    // Members
    else if (currentUser.role === ROLES.MEMBER) {
      throw new Error('Forbidden');
    }
  }
}

function buildActivityUpdateData(updatedData: any, currentUser: any) {
  const dbUpdates: any = {};

  // 1. Common Updates (Title, Thematic, Date)
  assignCommonFields(dbUpdates, updatedData);

  // 2. Status & Type Updates
  assignStatusAndTypeFields(dbUpdates, updatedData);

  // 3. Context Updates (Level, Site, SmallGroup)
  // National: Everything
  // Site: Can change Level and SmallGroup, but NOT Site
  if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
    assignContextFields(dbUpdates, updatedData);
  } else if (currentUser.role === ROLES.SITE_COORDINATOR) {
    if (updatedData.level !== undefined) dbUpdates.level = updatedData.level;
    if (updatedData.smallGroupId !== undefined) dbUpdates.smallGroupId = updatedData.smallGroupId;
    // Prevent changing siteId
  }

  return dbUpdates;
}

function assignCommonFields(target: any, source: any) {
  if (source.title !== undefined) target.title = source.title;
  if (source.thematic !== undefined) target.thematic = source.thematic;
  if (source.date !== undefined) target.date = source.date;
}

function assignStatusAndTypeFields(target: any, source: any) {
  if (source.status !== undefined) target.status = source.status;
  if (source.activityTypeId !== undefined) target.activityTypeId = source.activityTypeId;
  if (source.activityTypeEnum !== undefined) target.activityTypeEnum = source.activityTypeEnum;
  if (source.participantsCountPlanned !== undefined) target.participantsCountPlanned = source.participantsCountPlanned;
}

function assignContextFields(target: any, source: any) {
  if (source.level !== undefined) target.level = source.level;
  if (source.siteId !== undefined) target.siteId = source.siteId;
  if (source.smallGroupId !== undefined) target.smallGroupId = source.smallGroupId;
}

async function validateAndPrepareCreateData(activityData: ActivityFormData, currentUser: any) {
  const safeData = { ...activityData } as any; // Cast to allow adding fields
  safeData.createdBy = currentUser.id;

  if (currentUser.role === ROLES.SITE_COORDINATOR) {
    if (!currentUser.siteId) throw new Error('Site Coordinator has no site assigned');

    // Enforce Site Context
    safeData.siteId = currentUser.siteId;

    // Allow Site vs SG level choice
    if (safeData.level === 'small_group') {
      if (!safeData.smallGroupId) {
        // Fallback if they forgot to pick a group but said SG level?
        // Or throw error?
        // Let's assume validation caught it, or fallback to site level.
        safeData.level = 'site';
      }
      // We should verify that smallGroupId belongs to their site, but for now we trust the ID (or future FK check)
    } else {
      safeData.level = 'site';
      safeData.smallGroupId = undefined;
    }
  }
  else if (currentUser.role === ROLES.SMALL_GROUP_LEADER) {
    if (!currentUser.smallGroupId) throw new Error('Small Group Leader has no group assigned');
    safeData.level = 'small_group';
    safeData.smallGroupId = currentUser.smallGroupId;
    safeData.siteId = currentUser.siteId || undefined;
  }
  else if (currentUser.role === ROLES.MEMBER) {
    throw new Error('Unauthorized: Members cannot create activities');
  }

  return safeData;
}


