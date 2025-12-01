'use server';

import { prisma } from '@/lib/prisma';
import { Site, SiteFormData, SiteWithDetails, User } from '@/lib/types';

// Helper to convert frontend camelCase to DB snake_case for writing (Prisma handles this automatically via schema mapping, but we keep the input type)
// Actually, with Prisma we just pass the object matching the schema.
// The schema uses camelCase for fields in the client (e.g. coordinatorId), mapping to snake_case in DB.
// So we just need to map SiteFormData to Prisma input.

/**
 * Fetches all sites with enriched details.
 * Replaces RPC get_sites_with_details_for_user
 */
export async function getSitesWithDetails(user: User | null): Promise<SiteWithDetails[]> {
  if (!user) {
    throw new Error('User not authenticated.');
  }

  const whereClause: any = {};
  if (user.role === 'site_coordinator' && user.siteId) {
    whereClause.id = user.siteId;
  }
  // NATIONAL_COORDINATOR sees all.
  // Other roles: logic to be defined. For now, if they are not site coordinator, they might see all or none.
  // Assuming 'member' sees nothing or all? Original RPC logic is opaque here.
  // We'll assume strict access: National -> All, Site -> Own.
  // If user is neither, maybe return empty?
  // But let's stick to the previous logic: if not filtered, return all.

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
    coordinatorProfilePicture: undefined, // Not in Prisma schema currently
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

  const mappedSite: Site = {
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
      role: site.coordinator.role as any,
      status: site.coordinator.status as any,
      siteId: site.coordinator.siteId || undefined,
      smallGroupId: site.coordinator.smallGroupId || undefined,
      mandateStartDate: site.coordinator.mandateStartDate ? site.coordinator.mandateStartDate.toISOString() : undefined,
      mandateEndDate: site.coordinator.mandateEndDate ? site.coordinator.mandateEndDate.toISOString() : undefined,
    } : undefined
  };

  const mappedSmallGroups = site.smallGroups.map(sg => ({
    id: sg.id,
    name: sg.name,
    members_count: sg._count.registeredMembers,
    // Add other fields if needed by the UI
  }));

  return {
    site: mappedSite,
    smallGroups: mappedSmallGroups,
    totalMembers: site._count.registeredMembers
  };
}

export async function getSiteById(id: string): Promise<Site> {
  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      coordinator: true
    }
  });

  if (!site) {
    throw new Error('Site not found.');
  }

  return {
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
      role: site.coordinator.role as any,
      status: site.coordinator.status as any,
      siteId: site.coordinator.siteId || undefined,
      smallGroupId: site.coordinator.smallGroupId || undefined,
      mandateStartDate: site.coordinator.mandateStartDate ? site.coordinator.mandateStartDate.toISOString() : undefined,
      mandateEndDate: site.coordinator.mandateEndDate ? site.coordinator.mandateEndDate.toISOString() : undefined,
    } : undefined
  };
}

export async function createSite(siteData: SiteFormData): Promise<Site> {
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
    include: {
      coordinator: true
    }
  });

  return {
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
      role: site.coordinator.role as any,
      status: site.coordinator.status as any,
      siteId: site.coordinator.siteId || undefined,
      smallGroupId: site.coordinator.smallGroupId || undefined,
      mandateStartDate: site.coordinator.mandateStartDate ? site.coordinator.mandateStartDate.toISOString() : undefined,
      mandateEndDate: site.coordinator.mandateEndDate ? site.coordinator.mandateEndDate.toISOString() : undefined,
    } : undefined
  };
}

export async function updateSite(id: string, updatedData: Partial<SiteFormData>): Promise<Site> {
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
    include: {
      coordinator: true
    }
  });

  return {
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
      role: site.coordinator.role as any,
      status: site.coordinator.status as any,
      siteId: site.coordinator.siteId || undefined,
      smallGroupId: site.coordinator.smallGroupId || undefined,
      mandateStartDate: site.coordinator.mandateStartDate ? site.coordinator.mandateStartDate.toISOString() : undefined,
      mandateEndDate: site.coordinator.mandateEndDate ? site.coordinator.mandateEndDate.toISOString() : undefined,
    } : undefined
  };
}

export async function deleteSite(id: string): Promise<void> {
  try {
    await prisma.site.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === 'P2003') { // Prisma foreign key constraint failed
      throw new Error('Cannot delete site with active small groups or members. Please reassign them first.');
    }
    throw error;
  }
}


