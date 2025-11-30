'use server';

import { prisma } from '@/lib/prisma';
import { SmallGroup, SmallGroupFormData, User, UserRole } from '@/lib/types';
import { ROLES } from '@/lib/constants';

// Helper to map Prisma result to SmallGroup type
const mapPrismaGroupToSmallGroup = (group: any): SmallGroup => {
  return {
    id: group.id,
    name: group.name,
    siteId: group.siteId,
    leaderId: group.leaderId || undefined,
    logisticsAssistantId: group.logisticsAssistantId || undefined,
    financeAssistantId: group.financeAssistantId || undefined,
    meetingDay: group.meetingDay || undefined,
    meetingTime: group.meetingTime || undefined,
    meetingLocation: group.meetingLocation || undefined,
    // createdAt: group.createdAt ? group.createdAt.toISOString() : undefined, // Removed as it's not in SmallGroup type
    // Enriched fields
    siteName: group.site?.name,
    leaderName: group.leader?.name,
    memberCount: group._count?.registeredMembers || 0,

  };
};

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

export async function getFilteredSmallGroups({ user, search, siteId }: { user: User; search?: string, siteId?: string }): Promise<SmallGroup[]> {
  if (!user) {
    throw new Error('User not authenticated.');
  }

  const whereClause: any = {};

  switch (user.role) {
    case 'national_coordinator':
      if (siteId) whereClause.siteId = siteId;
      break;
    case 'site_coordinator':
      if (!user.siteId) return [];
      whereClause.siteId = user.siteId;
      break;
    case 'small_group_leader':
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

  if (!group) {
    throw new Error('Small group not found.');
  }

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

  if (!group) {
    throw new Error('Small group not found.');
  }

  return mapPrismaGroupToSmallGroup(group);
}

export async function createSmallGroup(siteId: string, formData: SmallGroupFormData): Promise<SmallGroup> {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the group
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

    // 2. Update profiles for assigned users
    const assignments = [
      { userId: formData.leaderId, role: 'small_group_leader' },
      { userId: formData.logisticsAssistantId, role: null },
      { userId: formData.financeAssistantId, role: null },
    ];

    for (const { userId, role } of assignments) {
      if (userId) {
        const updateData: any = {
          smallGroupId: newGroup.id,
          siteId: siteId,
        };
        if (role) updateData.role = role;

        await tx.profile.update({
          where: { id: userId },
          data: updateData
        });
      }
    }

    // Return the created group with details
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
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch old group to check previous assignments
    const oldGroup = await tx.smallGroup.findUnique({
      where: { id: groupId }
    });

    if (!oldGroup) throw new Error('Small group not found.');

    // 2. Update the group
    const updatedGroup = await tx.smallGroup.update({
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

    // 3. Handle assignments (Old vs New)
    const assignments = [
      { oldUserId: oldGroup.leaderId, newUserId: formData.leaderId, role: 'small_group_leader' },
      { oldUserId: oldGroup.logisticsAssistantId, newUserId: formData.logisticsAssistantId, role: null },
      { oldUserId: oldGroup.financeAssistantId, newUserId: formData.financeAssistantId, role: null },
    ];

    for (const { oldUserId, newUserId, role } of assignments) {
      if (oldUserId !== newUserId) {
        // Unassign old user
        if (oldUserId) {
          await tx.profile.update({
            where: { id: oldUserId },
            data: { smallGroupId: null }
          });
        }
        // Assign new user
        if (newUserId) {
          const updateData: any = {
            smallGroupId: groupId,
            siteId: oldGroup.siteId,
          };
          if (role) updateData.role = role;

          await tx.profile.update({
            where: { id: newUserId },
            data: updateData
          });
        }
      }
    }

    // Return updated group
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
  await prisma.$transaction(async (tx) => {
    // 1. Unassign all members (profiles)
    await tx.profile.updateMany({
      where: { smallGroupId: groupId },
      data: { smallGroupId: null }
    });

    // 2. Delete the group
    await tx.smallGroup.delete({
      where: { id: groupId }
    });
  });
}
