'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SmallGroup, SmallGroupFormData, User } from '@/lib/types';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

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
  leaderName: group.leader?.name || null,
  memberCount: group._count?.registeredMembers || 0,
  // Note: Nested user objects (leader, assistants) should be mapped/signed in individual fetchers
  leader: group.leader ? {
    id: group.leader.id,
    name: group.leader.name,
    email: group.leader.email,
    role: group.leader.role,
    avatarUrl: group.leader.avatarUrl || undefined,
  } : undefined,
  logisticsAssistant: group.logisticsAssistant ? {
    id: group.logisticsAssistant.id,
    name: group.logisticsAssistant.name,
    email: group.logisticsAssistant.email,
    role: group.logisticsAssistant.role,
    avatarUrl: group.logisticsAssistant.avatarUrl || undefined,
  } : undefined,
  financeAssistant: group.financeAssistant ? {
    id: group.financeAssistant.id,
    name: group.financeAssistant.name,
    email: group.financeAssistant.email,
    role: group.financeAssistant.role,
    avatarUrl: group.financeAssistant.avatarUrl || undefined,
  } : undefined,
});

/**
 * Helper to sign avatars for a list of small groups.
 */
async function signGroupAvatars(groups: SmallGroup[]): Promise<SmallGroup[]> {
  const filePaths: string[] = [];
  groups.forEach(g => {
    if (g.leader?.avatarUrl && !g.leader.avatarUrl.startsWith('http')) filePaths.push(g.leader.avatarUrl);
    if (g.logisticsAssistant?.avatarUrl && !g.logisticsAssistant.avatarUrl.startsWith('http')) filePaths.push(g.logisticsAssistant.avatarUrl);
    if (g.financeAssistant?.avatarUrl && !g.financeAssistant.avatarUrl.startsWith('http')) filePaths.push(g.financeAssistant.avatarUrl);
  });

  if (filePaths.length === 0) return groups;

  try {
    const { getSignedUrls } = await import('./storageService');
    const signedUrls = await getSignedUrls(filePaths, 'avatars');
    groups.forEach(g => {
      if (g.leader?.avatarUrl && signedUrls[g.leader.avatarUrl]) g.leader.avatarUrl = signedUrls[g.leader.avatarUrl];
      if (g.logisticsAssistant?.avatarUrl && signedUrls[g.logisticsAssistant.avatarUrl]) g.logisticsAssistant.avatarUrl = signedUrls[g.logisticsAssistant.avatarUrl];
      if (g.financeAssistant?.avatarUrl && signedUrls[g.financeAssistant.avatarUrl]) g.financeAssistant.avatarUrl = signedUrls[g.financeAssistant.avatarUrl];
    });
  } catch (e) {
    console.warn('[SmallGroupService] Batch signing failed:', e);
  }
  return groups;
}

export async function getSmallGroupsBySite(siteId: string): Promise<SmallGroup[]> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const groups = await prisma.smallGroup.findMany({
      where: { siteId },
      include: {
        site: true,
        leader: true,
        _count: {
          select: { registeredMembers: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mappedGroups = groups.map(mapPrismaGroupToSmallGroup);
    return signGroupAvatars(mappedGroups);
  });
}

export async function getFilteredSmallGroups({ user, search, siteId }: { user: User; search?: string; siteId?: string }): Promise<SmallGroup[]> {
  if (!user) throw new Error('User not authenticated.');

  return await withRLS(user.id, async () => {
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

    const mappedGroups = groups.map(mapPrismaGroupToSmallGroup);
    return signGroupAvatars(mappedGroups);
  });
}

export async function getSmallGroupById(groupId: string): Promise<SmallGroup> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const group = await prisma.smallGroup.findUnique({
      where: { id: groupId },
      include: {
        site: true,
        leader: true,
        _count: {
          select: { registeredMembers: true }
        }
      }
    });

    if (!group) throw new Error('Small group not found.');
    return mapPrismaGroupToSmallGroup(group);
  });
}

export async function getSmallGroupDetails(groupId: string): Promise<SmallGroup> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
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
  });
}

export async function createSmallGroup(siteId: string, formData: SmallGroupFormData): Promise<SmallGroup> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
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
      const mappedGroups = await signGroupAvatars([mapPrismaGroupToSmallGroup(createdGroup)]);
      return mappedGroups[0];
    });
  });
}

export async function updateSmallGroup(groupId: string, formData: Partial<SmallGroupFormData>): Promise<SmallGroup> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
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
      const mappedGroups = await signGroupAvatars([mapPrismaGroupToSmallGroup(result)]);
      return mappedGroups[0];
    });
  });
}

export async function deleteSmallGroup(groupId: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.profile.updateMany({
        where: { smallGroupId: groupId },
        data: { smallGroupId: null }
      });

      await tx.smallGroup.delete({ where: { id: groupId } });
    });
  });
}
