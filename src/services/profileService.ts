'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import { User, UserRole, ServiceResponse } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { checkDeletionEligibility } from '@/lib/safetyChecks';
import { ROLES } from '@/lib/constants';

/**
 * Helper to map Prisma Profile to User model and sign avatar URLs
 */
async function mapProfileToUser(data: any): Promise<User> {
  let avatarUrl = data.avatarUrl || undefined;
  if (avatarUrl && !avatarUrl.startsWith('http')) {
    try {
      const { getSignedUrl } = await import('./storageService');
      avatarUrl = await getSignedUrl(avatarUrl, 'avatars');
    } catch (e) {
      console.warn('[ProfileService] Failed to sign avatar URL:', e);
    }
  }

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
    avatarUrl,
  };
}

/**
 * Helper to map multiple Prisma Profiles to User models and batch sign avatar URLs
 */
async function mapProfilesToUsers(profiles: any[]): Promise<User[]> {
  const filePaths = profiles
    .map(u => u.avatarUrl)
    .filter(url => url && !url.startsWith('http')) as string[];

  let signedUrls: Record<string, string> = {};
  if (filePaths.length > 0) {
    try {
      const { getSignedUrls } = await import('./storageService');
      signedUrls = await getSignedUrls(filePaths, 'avatars');
    } catch (e) {
      console.warn('[ProfileService] Batch signing failed:', e);
    }
  }

  return profiles.map((p) => ({
    id: p.id,
    name: p.name || '',
    email: p.email || '',
    role: p.role as UserRole,
    status: p.status as any,
    siteId: p.siteId || undefined,
    smallGroupId: p.smallGroupId || undefined,
    mandateStartDate: p.mandateStartDate ? p.mandateStartDate.toISOString() : undefined,
    mandateEndDate: p.mandateEndDate ? p.mandateEndDate.toISOString() : undefined,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
    siteName: p.site?.name || undefined,
    smallGroupName: p.smallGroup?.name || undefined,
    avatarUrl: (p.avatarUrl && !p.avatarUrl.startsWith('http'))
      ? signedUrls[p.avatarUrl] || p.avatarUrl
      : p.avatarUrl || undefined,
  }));
}

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
  return mapProfileToUser(data);
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
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.siteId !== undefined) dbUpdates.siteId = updates.siteId;
  if (updates.smallGroupId !== undefined) dbUpdates.smallGroupId = updates.smallGroupId;
  if (updates.mandateStartDate !== undefined) dbUpdates.mandateStartDate = updates.mandateStartDate;
  if (updates.mandateEndDate !== undefined) dbUpdates.mandateEndDate = updates.mandateEndDate;
  if (updates.avatarUrl !== undefined) dbUpdates.avatarUrl = updates.avatarUrl;

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

  revalidatePath('/dashboard/settings/profile');
  return mapProfileToUser(data);
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

  return mapProfilesToUsers(users);
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

  return mapProfilesToUsers(users);
}

/**
 * Permanently deletes a user.
 * Only National Coordinators can delete users.
 * Users with existing data (Reports, Activities, Transactions) cannot be deleted.
 */
export async function deleteUser(userId: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const currentUser = await getUser();

  if (!currentUser) throw new Error('Unauthorized');

  return await withRLS(currentUser.id, async () => {
    // 1. RBAC Guard: Only National Coordinators can delete users
    const requester = await prisma.profile.findUnique({
      where: { id: currentUser.id },
      select: { role: true }
    });

    if (requester?.role !== ROLES.NATIONAL_COORDINATOR) {
      throw new Error('UNAUTHORIZED_ACTION: Only National Coordinators can perform user deletion.');
    }

    // 2. Structural Guard: check if user has data linked to them
    const eligibility = await checkDeletionEligibility(userId);
    if (!eligibility.canDelete) {
      throw new Error(`INELIGIBLE_FOR_DELETION: ${eligibility.reason}`);
    }

    // 3. Execution
    await prisma.profile.delete({
      where: { id: userId },
    });
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

  return mapProfilesToUsers(users);
}

/**
 * Uploads a user's avatar to storage and updates their profile.
 */
export async function uploadAvatar(formData: FormData): Promise<ServiceResponse<string>> {
  try {
    const { getUser } = getKindeServerSession();
    const currentUser = await getUser();

    if (!currentUser) {
      return { success: false, error: { message: "Unauthorized: User not authenticated" } };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: { message: "No file provided" } };
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: { message: "File must be an image" } };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: { message: "File size must be less than 5MB" } };
    }

    return await withRLS(currentUser.id, async () => {
      const currentProfile = await prisma.profile.findUnique({
        where: { id: currentUser.id },
        select: { avatarUrl: true }
      });

      const { uploadFile } = await import('./storageService');
      const result = await uploadFile(file, { bucket: 'avatars' });

      await basePrisma.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${currentUser.id}'`);
        await tx.profile.update({
          where: { id: currentUser.id },
          data: { avatarUrl: result.filePath }
        });
      }, { timeout: 15000 });

      // Cleanup old file
      if (currentProfile?.avatarUrl && currentProfile.avatarUrl !== result.filePath) {
        try {
          let oldPath = currentProfile.avatarUrl;
          if (oldPath.startsWith('http')) {
            const urlParts = oldPath.split('/avatars/');
            if (urlParts.length > 1) {
              oldPath = urlParts[1].split('?')[0];
            } else {
              oldPath = '';
            }
          }

          if (oldPath) {
            const { deleteFile } = await import('./storageService');
            await deleteFile(oldPath, { isRollback: true, bucketName: 'avatars' });
          }
        } catch (cleanupError) {
          console.warn('[ProfileService] Non-critical cleanup error:', cleanupError);
        }
      }

      const { getSignedUrl } = await import('./storageService');
      const signedUrl = await getSignedUrl(result.filePath, 'avatars');

      revalidatePath('/dashboard/settings/profile');
      return { success: true, data: signedUrl };
    });
  } catch (error: any) {
    console.error('[ProfileService] uploadAvatar FATAL:', error.message);
    return { success: false, error: { message: `Upload failed: ${error.message}` } };
  }
}
