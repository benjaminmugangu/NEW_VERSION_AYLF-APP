'use server';

import { prisma } from '@/lib/prisma';
import { User, UserRole } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { uploadFile } from './storageService';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';



/**
 * Retrieves a user's profile by their ID, including enriched data.
 */
export async function getProfile(userId: string): Promise<User> {
  const data = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      site: true,
      smallGroup: true,
    },
  });

  if (!data) throw new Error('Profile not found.');

  return {
    id: data.id,
    name: data.name || '',
    email: data.email || '',
    role: data.role as UserRole,
    status: data.status as any,
    siteId: data.siteId || undefined,
    smallGroupId: data.smallGroupId || undefined,
    mandateStartDate: data.mandateStartDate ? data.mandateStartDate.toISOString() : undefined,
    mandateEndDate: data.mandateEndDate ? data.mandateEndDate.toISOString() : undefined,
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : undefined,
    siteName: data.site?.name || undefined,
    smallGroupName: data.smallGroup?.name || undefined,
    avatarUrl: (data as any).avatarUrl || undefined,
  };
}

/**
 * Updates a user's profile.
 */
export async function updateProfile(userId: string, updates: Partial<User>): Promise<User> {
  if ('role' in updates) {
    console.warn(`[ProfileService] Attempted to change role for user ${userId}. This is not allowed.`);
    delete updates.role;
  }

  // Map User type (frontend) to Prisma input
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.siteId !== undefined) dbUpdates.siteId = updates.siteId;
  if (updates.smallGroupId !== undefined) dbUpdates.smallGroupId = updates.smallGroupId;
  if (updates.mandateStartDate !== undefined) dbUpdates.mandateStartDate = updates.mandateStartDate;
  if (updates.mandateEndDate !== undefined) dbUpdates.mandateEndDate = updates.mandateEndDate;

  // ✅ Apply Exclusivity Guards if role, siteId, or smallGroupId are updated
  // We need the current role to apply logic properly if it's not being updated
  const currentProfile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  const finalRole = updates.role || currentProfile?.role;

  if (finalRole === 'NATIONAL_COORDINATOR') {
    dbUpdates.siteId = null;
    dbUpdates.smallGroupId = null;
  } else if (finalRole === 'SITE_COORDINATOR') {
    dbUpdates.smallGroupId = null;
  }

  const data = await prisma.profile.update({
    where: { id: userId },
    data: dbUpdates,
    include: {
      site: true,
      smallGroup: true,
    },
  });

  return {
    id: data.id,
    name: data.name || '',
    email: data.email || '',
    role: data.role as UserRole,
    status: data.status as any,
    siteId: data.siteId || undefined,
    smallGroupId: data.smallGroupId || undefined,
    mandateStartDate: data.mandateStartDate ? data.mandateStartDate.toISOString() : undefined,
    mandateEndDate: data.mandateEndDate ? data.mandateEndDate.toISOString() : undefined,
    createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : undefined,
    siteName: data.site?.name || undefined,
    smallGroupName: data.smallGroup?.name || undefined,
  };
}

/**
 * Retrieves all users with their assignment details.
 */
export async function getUsers(): Promise<User[]> {
  const users = await prisma.profile.findMany({
    include: {
      site: true,
      smallGroup: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (users as any[]).map((u: any) => ({
    id: u.id,
    name: u.name || '',
    email: u.email || '',
    role: u.role as UserRole,
    status: u.status as any,
    siteId: u.siteId || undefined,
    smallGroupId: u.smallGroupId || undefined,
    mandateStartDate: u.mandateStartDate ? u.mandateStartDate.toISOString() : undefined,
    mandateEndDate: u.mandateEndDate ? u.mandateEndDate.toISOString() : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
    siteName: u.site?.name || undefined,
    smallGroupName: u.smallGroup?.name || undefined,
    avatarUrl: (u as any).avatarUrl || undefined,
  }));
}

/**
 * Retrieves users eligible for leadership roles.
 */
export async function getEligiblePersonnel(siteId: string, smallGroupId?: string): Promise<User[]> {
  const whereClause: any = {
    status: { not: 'inactive' },
    OR: [
      { role: 'NATIONAL_COORDINATOR' },
      { role: 'SITE_COORDINATOR', siteId: siteId },
    ]
  };

  if (smallGroupId) {
    whereClause.OR.push({
      role: 'SMALL_GROUP_LEADER',
      OR: [
        { smallGroupId: null },
        { smallGroupId: smallGroupId }
      ]
    });
  } else {
    whereClause.OR.push({
      role: 'SMALL_GROUP_LEADER',
      smallGroupId: null
    });
  }

  const users = await prisma.profile.findMany({
    where: whereClause,
    include: {
      site: true,
      smallGroup: true,
    }
  });

  return (users as any[]).map((u: any) => ({
    id: u.id,
    name: u.name || '',
    email: u.email || '',
    role: u.role as UserRole,
    status: u.status as any,
    siteId: u.siteId || undefined,
    smallGroupId: u.smallGroupId || undefined,
    mandateStartDate: u.mandateStartDate ? u.mandateStartDate.toISOString() : undefined,
    mandateEndDate: u.mandateEndDate ? u.mandateEndDate.toISOString() : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
    siteName: u.site?.name || undefined,
    smallGroupName: u.smallGroup?.name || undefined,
    avatarUrl: (u as any).avatarUrl || undefined,
  }));
}

/**
 * Permanently deletes a user.
 */
export async function deleteUser(userId: string): Promise<void> {
  // Note: This only deletes the Prisma profile. 
  // Kinde user deletion requires Kinde Management API.
  await prisma.profile.delete({
    where: { id: userId },
  });
}

/**
 * Retrieves multiple user profiles by their IDs.
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  if (!userIds || userIds.length === 0) return [];

  const users = await prisma.profile.findMany({
    where: {
      id: { in: userIds },
    },
    include: {
      site: true,
      smallGroup: true,
    }
  });

  return (users as any[]).map((u: any) => ({
    id: u.id,
    name: u.name || '',
    email: u.email || '',
    role: u.role as UserRole,
    status: u.status as any,
    siteId: u.siteId || undefined,
    smallGroupId: u.smallGroupId || undefined,
    mandateStartDate: u.mandateStartDate ? u.mandateStartDate.toISOString() : undefined,
    mandateEndDate: u.mandateEndDate ? u.mandateEndDate.toISOString() : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
    siteName: u.site?.name || undefined,
    smallGroupName: u.smallGroup?.name || undefined,
    avatarUrl: (u as any).avatarUrl || undefined,
  }));
}



export async function uploadAvatar(formData: FormData) {
  const { getUser } = getKindeServerSession();
  const currentUser = await getUser();

  if (!currentUser) throw new Error('Unauthorized');

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  // Verify file type and size
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }
  if (file.size > 5 * 1024 * 1024) { // 5MB
    throw new Error('File size must be less than 5MB');
  }

  // Upload
  const result = await uploadFile(file, { bucket: 'avatars' });

  // Update Profile
  await prisma.profile.update({
    where: { id: currentUser.id },
    data: { avatarUrl: result.publicUrl }
  });

  revalidatePath('/dashboard/settings/profile');
  return result.publicUrl;
}
