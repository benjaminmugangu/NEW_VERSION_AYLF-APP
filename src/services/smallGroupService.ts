'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SmallGroup, SmallGroupFormData, User } from '@/lib/types';

// Helper to map Prisma result to SmallGroup type
const mapPrismaGroupToSmallGroup = (group: any): SmallGroup => ({
  id: group.id,
  name: group.name,
  siteId: group.siteId,
  leaderId: group.leaderId || undefined,
  logisticsAssistantId: group.logisticsAssistantId || undefined,
  financeAssistantId: group.financeAssistantId || undefined,
  meetingDay: group.meetingDay || undefined,
  meetingTime: group.meetingTime || undefined,
  meetingLocation: group.meetingLocation || undefined,
  siteName: group.site?.name,
  leaderName: group.leader?.name,
  memberCount: group._count?.registeredMembers || 0,
});

export async function getSmallGroupsBySite(siteId: string): Promise<SmallGroup[]> {
  const groups = await prisma.smallGroup.findMany({
    where: { siteId },
    include: {
      leader: true,
      _count: {
        select: { registeredMembers: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return groups.map(mapPrismaGroupToSmallGroup);
}

export async function getFilteredSmallGroups({ user, search, siteId }: { user: User; search?: string; siteId?: string }): Promise<SmallGroup[]> {
  if (!user) {
    throw new Error('User not authenticated.');
  }

  const whereClause: any = {};

  switch (user.role) {
    case 'NATIONAL_COORDINATOR':
      if (siteId) whereClause.siteId = siteId;
      break;
    case 'SITE_COORDINATOR':
      if (!user.siteId) return [];
      whereClause.siteId = user.siteId;
      break;
    case 'SMALL_GROUP_LEADER':
      if (!user.smallGroupId) return [];
      whereClause.id = user.smallGroupId;
      break;
    default:
      return [];
  }

  if (search) {
    whereClause.name = { contains: search, mode: 'insensitive' };
  }

  const groups = await prisma.smallGroup.findMany({
    where: whereClause,
    include: {
      site: true,
      leader: true,
      _count: {
        select: { registeredMembers: true }
      }
    }
  });

  return groups.map(mapPrismaGroupToSmallGroup);
}

export async function getSmallGroupById(groupId: string): Promise<SmallGroup> {
  const group = await prisma.smallGroup.findUnique({
    where: { id: groupId },
    include: {
      leader: true,
      _count: {
        select: { registeredMembers: true }
      }
    }
  });

  if (!group) throw new Error('Small group not found.');
  return mapPrismaGroupToSmallGroup(group);
}

export async function getSmallGroupDetails(groupId: string): Promise<SmallGroup> {
  const group = await prisma.smallGroup.findUnique({
    where: { id: groupId },
    include: {
      site: true,
      leader: true,
      logisticsAssistant: true,
      financeAssistant: true,
      _count: {
        select: { registeredMembers: true }
      }
    }
  });

  if (!group) throw new Error('Small group not found.');
  return mapPrismaGroupToSmallGroup(group);
}

export async function createSmallGroup(siteId: string, formData: SmallGroupFormData): Promise<SmallGroup> {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newGroup = await tx.smallGroup.create({
      data: {
        name: formData.name,
        siteId: siteId,
        meetingDay: formData.meetingDay,
        meetingTime: formData.meetingTime,
        meetingLocation: formData.meetingLocation,
        leaderId: formData.leaderId,
        logisticsAssistantId: formData.logisticsAssistantId,
        financeAssistantId: formData.financeAssistantId,
      }
    });

    const assignments = [
      { userId: formData.leaderId, role: 'SMALL_GROUP_LEADER' },
      { userId: formData.logisticsAssistantId, role: null },
      { userId: formData.financeAssistantId, role: null },
    ];

    for (const { userId, role } of assignments) {
      if (userId) {
        const updateData: any = { smallGroupId: newGroup.id, siteId: siteId };
        if (role) updateData.role = role;

        await tx.profile.update({
          where: { id: userId },
          data: updateData
        });
      }
    }

    const createdGroup = await tx.smallGroup.findUnique({
      where: { id: newGroup.id },
      include: {
        site: true,
        leader: true,
        logisticsAssistant: true,
        financeAssistant: true,
        _count: { select: { registeredMembers: true } }
      }
    });

    if (!createdGroup) throw new Error('Failed to retrieve created group');
    return mapPrismaGroupToSmallGroup(createdGroup);
  });
}

export async function updateSmallGroup(groupId: string, formData: Partial<SmallGroupFormData>): Promise<SmallGroup> {
  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const oldGroup = await tx.smallGroup.findUnique({ where: { id: groupId } });
    if (!oldGroup) throw new Error('Small group not found.');

    await tx.smallGroup.update({
      where: { id: groupId },
      data: {
        name: formData.name,
        meetingDay: formData.meetingDay,
        meetingTime: formData.meetingTime,
        meetingLocation: formData.meetingLocation,
        leaderId: formData.leaderId,
        logisticsAssistantId: formData.logisticsAssistantId,
        financeAssistantId: formData.financeAssistantId,
      }
    });

    const assignments = [
      { oldUserId: oldGroup.leaderId, newUserId: formData.leaderId, role: 'SMALL_GROUP_LEADER' },
      { oldUserId: oldGroup.logisticsAssistantId, newUserId: formData.logisticsAssistantId, role: null },
      { oldUserId: oldGroup.financeAssistantId, newUserId: formData.financeAssistantId, role: null },
    ];

    for (const { oldUserId, newUserId, role } of assignments) {
      if (oldUserId !== newUserId) {
        if (oldUserId) await tx.profile.update({ where: { id: oldUserId }, data: { smallGroupId: null } });
        if (newUserId) {
          const updateData: any = { smallGroupId: groupId, siteId: oldGroup.siteId };
          if (role) updateData.role = role;
          await tx.profile.update({ where: { id: newUserId }, data: updateData });
        }
      }
    }

    const result = await tx.smallGroup.findUnique({
      where: { id: groupId },
      include: {
        site: true,
        leader: true,
        logisticsAssistant: true,
        financeAssistant: true,
        _count: { select: { registeredMembers: true } }
      }
    });

    if (!result) throw new Error('Failed to retrieve updated group');
    return mapPrismaGroupToSmallGroup(result);
  });
}

export async function deleteSmallGroup(groupId: string): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.profile.updateMany({
      where: { smallGroupId: groupId },
      data: { smallGroupId: null }
    });

    await tx.smallGroup.delete({ where: { id: groupId } });
  });
}
