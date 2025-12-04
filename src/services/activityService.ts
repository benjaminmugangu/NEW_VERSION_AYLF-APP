'use server';

import { prisma } from '@/lib/prisma';
import { Activity, ActivityStatus, ActivityType, User, UserRole } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { activityFormSchema, type ActivityFormData } from '@/schemas/activity';


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
  const { user, searchTerm, dateFilter, statusFilter, levelFilter } = filters;
  if (!user) throw new Error('User not authenticated.');

  const where: any = {};

  // RBAC
  if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
    where.OR = [
      { level: 'national' },
      { level: 'site', siteId: user.siteId },
      { level: 'small_group', siteId: user.siteId }
    ];
  } else if (user.role === ROLES.SMALL_GROUP_LEADER && user.siteId && user.smallGroupId) {
    where.OR = [
      { level: 'national' },
      { level: 'site', siteId: user.siteId },
      { level: 'small_group', smallGroupId: user.smallGroupId }
    ];
  }
  // National Coordinator sees all (no RBAC filter)

  // Search
  if (searchTerm) {
    where.title = { contains: searchTerm, mode: 'insensitive' };
  }

  // Date
  if (dateFilter?.from || dateFilter?.to) {
    where.date = {};
    if (dateFilter.from) where.date.gte = dateFilter.from;
    if (dateFilter.to) where.date.lte = dateFilter.to;
  }

  // Status
  if (statusFilter) {
    const statuses = Object.entries(statusFilter)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }
  }

  // Level
  if (levelFilter) {
    const levels = Object.entries(levelFilter)
      .filter(([_, v]) => v)
      .map(([k]) => k);
    if (levels.length > 0) {
      where.level = { in: levels };
    }
  }

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
  const activity = await prisma.activity.create({
    data: {
      title: activityData.title,
      thematic: activityData.thematic,
      date: activityData.date,
      level: activityData.level,
      status: activityData.status,
      siteId: activityData.siteId,
      smallGroupId: activityData.smallGroupId,
      activityTypeId: activityData.activityTypeId || '00000000-0000-0000-0000-000000000000',
      activityTypeEnum: activityData.activityTypeEnum,
      participantsCountPlanned: activityData.participantsCountPlanned,
      createdById: activityData.createdBy,
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
  // Map frontend data to Prisma update object
  const dbUpdates: any = {};
  const data = updatedData as any; // Loose typing to handle both types

  if (data.title !== undefined) dbUpdates.title = data.title;
  if (data.thematic !== undefined) dbUpdates.thematic = data.thematic;
  if (data.date !== undefined) dbUpdates.date = data.date;
  if (data.level !== undefined) dbUpdates.level = data.level;
  if (data.status !== undefined) dbUpdates.status = data.status;
  if (data.siteId !== undefined) dbUpdates.siteId = data.siteId;
  if (data.smallGroupId !== undefined) dbUpdates.smallGroupId = data.smallGroupId;
  if (data.activityTypeId !== undefined) dbUpdates.activityTypeId = data.activityTypeId;
  if (data.activityTypeEnum !== undefined) dbUpdates.activityTypeEnum = data.activityTypeEnum;
  if (data.participantsCountPlanned !== undefined) dbUpdates.participantsCountPlanned = data.participantsCountPlanned;
  if (data.createdBy !== undefined) dbUpdates.createdById = data.createdBy;

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


