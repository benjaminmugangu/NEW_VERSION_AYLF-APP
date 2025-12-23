'use server';

import { prisma } from '@/lib/prisma';
import { Site, SiteFormData, SiteWithDetails, User } from '@/lib/types';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { ROLES } from '@/lib/constants';

// Helper to map Prisma Site to Model
const mapPrismaSiteToModel = (site: any): Site => ({
  id: site.id,
  name: site.name,
  city: site.city,
  country: site.country,
  creationDate: site.createdAt.toISOString(),
  coordinatorId: site.coordinatorId || undefined,
  coordinator: site.coordinator ? mapPrismaProfileToModel(site.coordinator) : undefined,
});

const mapPrismaProfileToModel = (profile: any) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role,
  status: profile.status,
  siteId: profile.siteId || undefined,
  smallGroupId: profile.smallGroupId || undefined,
  mandateStartDate: profile.mandateStartDate?.toISOString() ?? undefined,
  mandateEndDate: profile.mandateEndDate?.toISOString() ?? undefined,
});

/**
 * Fetches all sites with enriched details.
 */
export async function getSitesWithDetails(user: User | null): Promise<SiteWithDetails[]> {
  if (!user) {
    throw new Error('User not authenticated.');
  }

  const whereClause: any = {};
  if (user.role === 'SITE_COORDINATOR' && user.siteId) {
    whereClause.id = user.siteId;
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

  return sites.map(site => ({
    id: site.id,
    name: site.name,
    city: site.city,
    country: site.country,
    creationDate: site.createdAt.toISOString(),
    coordinatorId: site.coordinatorId || undefined,
    coordinatorName: site.coordinator?.name || null,
    coordinatorProfilePicture: undefined,
    smallGroupsCount: site._count.smallGroups,
    membersCount: site._count.registeredMembers,
  }));
}

/**
 * Fetches details for a specific site, including small groups and member counts.
 */
export async function getSiteDetails(siteId: string): Promise<{ site: Site; smallGroups: any[]; totalMembers: number }> {
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

  return {
    site: mapPrismaSiteToModel(site),
    smallGroups: site.smallGroups.map(sg => ({
      id: sg.id,
      name: sg.name,
      membersCount: sg._count.registeredMembers,
    })),
    totalMembers: site._count.registeredMembers
  };
}

export async function getSiteById(id: string): Promise<Site> {
  const site = await prisma.site.findUnique({
    where: { id },
    include: { coordinator: true }
  });

  if (!site) {
    throw new Error('Site not found.');
  }

  return mapPrismaSiteToModel(site);
}

export async function createSite(siteData: SiteFormData): Promise<Site> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

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
}

export async function updateSite(id: string, updatedData: Partial<SiteFormData>): Promise<Site> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

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
}

export async function deleteSite(id: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user) throw new Error('Unauthorized');

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
}
