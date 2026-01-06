'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { Site, SiteFormData, SiteWithDetails, User } from '@/lib/types';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { ROLES } from '@/lib/constants';

// Helper to map Prisma Site to Model (Synchronous, but profile mapping handled in fetchers if async signing needed)
const mapPrismaSiteToModel = (site: any): Site => ({
  id: site.id,
  name: site.name,
  city: site.city,
  country: site.country,
  creationDate: site.createdAt.toISOString(),
  coordinatorId: site.coordinatorId || undefined,
  coordinator: site.coordinator ? {
    id: site.coordinator.id,
    name: site.coordinator.name,
    email: site.coordinator.email,
    role: site.coordinator.role,
    status: site.coordinator.status,
    siteId: site.coordinator.siteId || undefined,
    smallGroupId: site.coordinator.smallGroupId || undefined,
    mandateStartDate: site.coordinator.mandateStartDate?.toISOString() ?? undefined,
    mandateEndDate: site.coordinator.mandateEndDate?.toISOString() ?? undefined,
    // Note: avatarUrl signing handled in individual service functions to avoid making mapPrismaSiteToModel async everywhere
    avatarUrl: site.coordinator.avatarUrl || undefined,
  } : undefined,
});

/**
 * Fetches all sites with enriched details.
 */
export async function getSitesWithDetails(user: User | null): Promise<SiteWithDetails[]> {
  if (!user) {
    throw new Error('User not authenticated.');
  }

  return await withRLS(user.id, async () => {
    const whereClause: any = {};
    if (user.role === 'SITE_COORDINATOR' && user.siteId) {
      whereClause.id = user.siteId;
    } else if (user.role === 'SMALL_GROUP_LEADER') {
      if (user.siteId) {
        whereClause.id = user.siteId;
      } else {
        // SGL without a site should see nothing
        return [];
      }
    }

    const sites = await prisma.site.findMany({
      where: whereClause,
      include: {
        coordinator: true,
        _count: {
          select: {
            smallGroups: true,
            registeredMembers: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Batch sign coordinator avatars
    const filePaths = sites
      .map((s: any) => (s.coordinator as any)?.avatarUrl)
      .filter((url: string | null) => url && !url.startsWith('http')) as string[];

    let signedUrls: Record<string, string> = {};
    if (filePaths.length > 0) {
      try {
        const { getSignedUrls } = await import('./storageService');
        signedUrls = await getSignedUrls(filePaths, 'avatars');
      } catch (e) {
        console.warn('[SiteService] Batch signing failed:', e);
      }
    }

    return (sites as any[]).map((site: any) => {
      const coordinatorAvatarUrl = (site.coordinator as any)?.avatarUrl;
      const finalAvatarUrl = (coordinatorAvatarUrl && !coordinatorAvatarUrl.startsWith('http'))
        ? signedUrls[coordinatorAvatarUrl] || coordinatorAvatarUrl
        : coordinatorAvatarUrl || undefined;

      return {
        id: site.id,
        name: site.name,
        city: site.city,
        country: site.country,
        creationDate: site.createdAt.toISOString(),
        coordinatorId: site.coordinatorId || undefined,
        coordinatorName: site.coordinator?.name || null,
        coordinatorProfilePicture: finalAvatarUrl,
        smallGroupsCount: site._count.smallGroups,
        membersCount: site._count.registeredMembers,
      };
    });
  });
}

/**
 * Fetches details for a specific site, including small groups and member counts.
 */
export async function getSiteDetails(siteId: string): Promise<{ site: Site; smallGroups: any[]; totalMembers: number }> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        coordinator: true,
        smallGroups: {
          include: {
            _count: {
              select: { registeredMembers: true }
            }
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { registeredMembers: true }
        }
      }
    });

    if (!site) {
      throw new Error('Site not found.');
    }

    const siteModel = mapPrismaSiteToModel(site);

    // Sign coordinator avatar
    if (siteModel.coordinator?.avatarUrl && !siteModel.coordinator.avatarUrl.startsWith('http')) {
      try {
        const { getSignedUrl } = await import('./storageService');
        siteModel.coordinator.avatarUrl = await getSignedUrl(siteModel.coordinator.avatarUrl, 'avatars');
      } catch (e) {
        console.warn('[SiteService] Failed to sign coordinator avatar:', e);
      }
    }

    return {
      site: siteModel,
      smallGroups: (site.smallGroups as any[]).map((sg: any) => ({
        id: sg.id,
        name: sg.name,
        membersCount: sg._count.registeredMembers,
      })),
      totalMembers: site._count.registeredMembers
    };
  });
}

export async function getSiteById(id: string): Promise<Site> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const site = await prisma.site.findUnique({
      where: { id },
      include: { coordinator: true }
    });

    if (!site) {
      throw new Error('Site not found.');
    }

    const siteModel = mapPrismaSiteToModel(site);

    // Sign coordinator avatar
    if (siteModel.coordinator?.avatarUrl && !siteModel.coordinator.avatarUrl.startsWith('http')) {
      try {
        const { getSignedUrl } = await import('./storageService');
        siteModel.coordinator.avatarUrl = await getSignedUrl(siteModel.coordinator.avatarUrl, 'avatars');
      } catch (e) {
        console.warn('[SiteService] Failed to sign coordinator avatar:', e);
      }
    }

    return siteModel;
  });
}

export async function createSite(siteData: SiteFormData): Promise<Site> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const currentUser = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!currentUser || currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
      throw new Error('Forbidden: Only National Coordinators can create sites');
    }

    if (!siteData.name || siteData.name.trim().length < 3) {
      throw new Error('Site name must be at least 3 characters long.');
    }

    const site = await prisma.site.create({
      data: {
        name: siteData.name,
        city: siteData.city,
        country: siteData.country,
        coordinatorId: siteData.coordinatorId,
      },
      include: { coordinator: true }
    });

    return mapPrismaSiteToModel(site);
  });
}

export async function updateSite(id: string, updatedData: Partial<SiteFormData>): Promise<Site> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const currentUser = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!currentUser) throw new Error('Unauthorized');

    if (currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
      if (currentUser.role !== ROLES.SITE_COORDINATOR || currentUser.siteId !== id) {
        throw new Error('Forbidden');
      }
    }

    if (updatedData.name && updatedData.name.trim().length < 3) {
      throw new Error('Site name must be at least 3 characters long.');
    }

    const site = await prisma.site.update({
      where: { id },
      data: {
        name: updatedData.name,
        city: updatedData.city,
        country: updatedData.country,
        coordinatorId: updatedData.coordinatorId,
      },
      include: { coordinator: true }
    });

    return mapPrismaSiteToModel(site);
  });
}

export async function deleteSite(id: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

  return await withRLS(user.id, async () => {
    const currentUser = await prisma.profile.findUnique({ where: { id: user.id } });

    if (!currentUser || currentUser.role !== ROLES.NATIONAL_COORDINATOR) {
      throw new Error('Forbidden: Only National Coordinators can delete sites');
    }

    try {
      await prisma.site.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2003') {
        throw new Error('Cannot delete site with active small groups or members. Please reassign them first.');
      }
      throw error;
    }
  });
}
