// src/services/allocations.service.ts
'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import type { FundAllocation, FundAllocationFormData } from '@/lib/types';
import { calculateAvailableBudget } from './budgetService';
import { revalidatePath } from 'next/cache';

export async function getAllocations(filters?: { siteId?: string; smallGroupId?: string }): Promise<FundAllocation[]> {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  // If no user, return empty (RLS will handle this anyway, but this is a fail-safe)
  if (!kindeUser) return [];

  return await withRLS(kindeUser.id, async () => {
    const where: any = {};

    if (filters?.siteId) {
      where.siteId = filters.siteId;
    }
    if (filters?.smallGroupId) {
      where.smallGroupId = filters.smallGroupId;
    }

    const allocations = await prisma.fundAllocation.findMany({
      where,
      include: {
        allocatedBy: true,
        site: true,
        smallGroup: true,
        fromSite: true,
      },
      orderBy: {
        allocationDate: 'desc'
      }
    });

    return allocations.map((allocation: any) => ({
      id: allocation.id,
      amount: allocation.amount,
      allocationDate: allocation.allocationDate.toISOString(),
      goal: allocation.goal,
      source: allocation.source,
      status: allocation.status as any,
      allocatedById: allocation.allocatedById,
      siteId: allocation.siteId || undefined,
      smallGroupId: allocation.smallGroupId || undefined,
      notes: allocation.notes || undefined,
      allocationType: allocation.allocationType as 'hierarchical' | 'direct',
      bypassReason: allocation.bypassReason || undefined,
      allocatedByName: allocation.allocatedBy.name,
      siteName: allocation.site?.name,
      smallGroupName: allocation.smallGroup?.name,
      fromSiteName: allocation.fromSite?.name || 'National',
      fromSiteId: allocation.fromSiteId || undefined,
      proofUrl: allocation.proofUrl || undefined,
    }));
  });
}

export async function getAllocationById(id: string): Promise<FundAllocation> {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  if (!kindeUser) {
    throw new Error("Unauthorized: User not authenticated");
  }

  return await withRLS(kindeUser.id, async () => {
    const allocation = await prisma.fundAllocation.findUnique({
      where: { id },
      include: {
        allocatedBy: true,
        site: true,
        smallGroup: true,
        fromSite: true,
      }
    });

    if (!allocation) {
      throw new Error('Allocation not found.');
    }

    return {
      id: allocation.id,
      amount: allocation.amount,
      allocationDate: allocation.allocationDate.toISOString(),
      goal: allocation.goal,
      source: allocation.source,
      status: allocation.status as any,
      allocatedById: allocation.allocatedById,
      siteId: allocation.siteId || undefined,
      smallGroupId: allocation.smallGroupId || undefined,
      notes: allocation.notes || undefined,
      allocationType: allocation.allocationType as 'hierarchical' | 'direct',
      bypassReason: allocation.bypassReason || undefined,
      allocatedByName: allocation.allocatedBy.name,
      siteName: allocation.site?.name,
      smallGroupName: allocation.smallGroup?.name,
      fromSiteName: allocation.fromSite?.name || 'National',
      fromSiteId: allocation.fromSiteId || undefined,
      proofUrl: allocation.proofUrl || undefined,
    };
  });
}

export async function createAllocation(formData: FundAllocationFormData): Promise<FundAllocation> {
  // Get authenticated user (using static import from line 6)
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  if (!kindeUser) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Fetch profile (Bypassing RLS enforcement to ensure we can read own metadata)
  const profile = await prisma.profile.findUnique({
    where: { id: kindeUser.id },
    select: { role: true, siteId: true, name: true }
  });

  if (!profile) {
    throw new Error(`User profile not found for user ${kindeUser.id}. Please ensure your account is fully set up or contact support.`);
  }

  console.log(`[AllocationService] Creating allocation for user ${kindeUser.id}, role: ${profile.role}`);

  // CRITICAL: We use a single, unified transaction on basePrisma to avoid extension recursion
  // and ensure all operations (Allocation, Audit, Notification) share the same RLS context.
  return await basePrisma.$transaction(async (tx: any) => {
    try {
      // 1. Manually set RLS context at the start of the transaction
      await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${kindeUser.id}'`);

      // ═══════════════════════════════════════════════════════════
      // NATIONAL COORDINATOR LOGIC
      // ═══════════════════════════════════════════════════════════
      if (profile.role === 'NATIONAL_COORDINATOR') {

        // Case 1: Hierarchical Allocation (NC → Site) - DEFAULT
        if (!formData.isDirect) {
          if (!formData.siteId) {
            throw new Error("Hierarchical allocation requires a target Site");
          }

          if (formData.smallGroupId) {
            throw new Error("Hierarchical NC allocation must target a Site ONLY (not a Small Group). Use direct allocation if you need to bypass the Site Coordinator.");
          }

          const allocation = await tx.fundAllocation.create({
            data: {
              amount: formData.amount,
              allocationDate: new Date(formData.allocationDate),
              goal: formData.goal,
              source: formData.source,
              status: formData.status,
              siteId: formData.siteId,
              smallGroupId: null,
              allocationType: 'hierarchical',
              bypassReason: null,
              allocatedById: kindeUser.id,
              notes: formData.notes,
              fromSiteId: formData.fromSiteId || null,
              proofUrl: formData.proofUrl || null,
            },
            include: {
              allocatedBy: true,
              site: true,
              smallGroup: true,
              fromSite: true,
            }
          });

          return {
            id: allocation.id,
            amount: allocation.amount,
            allocationDate: allocation.allocationDate.toISOString(),
            goal: allocation.goal,
            source: allocation.source,
            status: allocation.status as any,
            allocatedById: allocation.allocatedById,
            siteId: allocation.siteId || undefined,
            smallGroupId: allocation.smallGroupId || undefined,
            notes: allocation.notes || undefined,
            allocationType: allocation.allocationType as 'hierarchical' | 'direct',
            bypassReason: allocation.bypassReason || undefined,
            allocatedByName: (allocation as any).allocatedBy.name,
            siteName: (allocation as any).site?.name,
            smallGroupName: (allocation as any).smallGroup?.name,
            fromSiteName: (allocation as any).fromSite?.name || 'National',
            fromSiteId: (allocation as any).fromSiteId || undefined,
            proofUrl: (allocation as any).proofUrl || undefined,
          };
        }

        // Case 2: Direct Allocation (NC → Small Group) - EXCEPTIONAL
        else {
          if (!formData.smallGroupId) {
            throw new Error("Direct allocation requires a target Small Group");
          }

          if (!formData.bypassReason || formData.bypassReason.trim().length < 20) {
            throw new Error("Direct allocations require a detailed justification (minimum 20 characters).");
          }

          // Fetch Small Group within the SAME transaction using tx
          const smallGroup = await tx.smallGroup.findUnique({
            where: { id: formData.smallGroupId },
            include: { site: true }
          });

          if (!smallGroup) {
            throw new Error("Small Group not found");
          }

          // 1. Create Allocation
          const allocation = await tx.fundAllocation.create({
            data: {
              amount: formData.amount,
              allocationDate: new Date(formData.allocationDate),
              goal: formData.goal,
              source: formData.source,
              status: formData.status,
              siteId: smallGroup.siteId,
              smallGroupId: formData.smallGroupId,
              allocationType: 'direct',
              bypassReason: formData.bypassReason,
              allocatedById: kindeUser.id,
              notes: formData.notes,
              fromSiteId: formData.fromSiteId || null,
              proofUrl: formData.proofUrl || null,
            },
            include: {
              allocatedBy: true,
              site: true,
              smallGroup: true,
              fromSite: true,
            }
          });

          // 2. Create Audit Log
          await tx.auditLog.create({
            data: {
              actorId: kindeUser.id,
              action: 'create',
              entityType: 'FundAllocation',
              entityId: allocation.id,
              metadata: {
                type: 'direct_allocation',
                bypassReason: formData.bypassReason,
                targetGroup: smallGroup.name
              },
              createdAt: new Date()
            }
          });

          // 3. Notify Site Coordinator
          const siteCoordinator = await tx.member.findFirst({
            where: {
              siteId: smallGroup.siteId,
              type: 'SITE_COORDINATOR'
            }
          });

          if (siteCoordinator && siteCoordinator.userId) {
            await tx.notification.create({
              data: {
                userId: siteCoordinator.userId,
                type: 'BUDGET_ALERT',
                title: '⚠️ Allocation Directe (Bypass)',
                message: `Le NC a alloué ${formData.amount} FC directement au groupe "${smallGroup.name}".`,
                link: `/dashboard/finances/allocations/${allocation.id}`,
                read: false,
                createdAt: new Date()
              }
            });
          }

          return {
            id: allocation.id,
            amount: allocation.amount,
            allocationDate: allocation.allocationDate.toISOString(),
            goal: allocation.goal,
            source: allocation.source,
            status: allocation.status as any,
            allocatedById: allocation.allocatedById,
            siteId: allocation.siteId || undefined,
            smallGroupId: allocation.smallGroupId || undefined,
            notes: allocation.notes || undefined,
            allocationType: allocation.allocationType as 'hierarchical' | 'direct',
            bypassReason: allocation.bypassReason || undefined,
            allocatedByName: (allocation as any).allocatedBy.name,
            siteName: (allocation as any).site?.name,
            smallGroupName: (allocation as any).smallGroup?.name,
            fromSiteName: (allocation as any).fromSite?.name || 'National',
            fromSiteId: (allocation as any).fromSiteId || undefined,
            proofUrl: (allocation as any).proofUrl || undefined,
          };
        }
      }

      // ═══════════════════════════════════════════════════════════
      // SITE COORDINATOR LOGIC
      // ═══════════════════════════════════════════════════════════
      else if (profile.role === 'SITE_COORDINATOR') {
        if (!profile.siteId) {
          throw new Error("Site Coordinator has no assigned site");
        }

        if (!formData.smallGroupId) {
          throw new Error("Site Coordinator must allocate to a Small Group within their site");
        }

        const smallGroup = await tx.smallGroup.findUnique({
          where: { id: formData.smallGroupId },
          select: { siteId: true, name: true }
        });

        if (!smallGroup || smallGroup.siteId !== profile.siteId) {
          throw new Error("Cannot allocate to Small Group from another site");
        }

        const allocation = await tx.fundAllocation.create({
          data: {
            amount: formData.amount,
            allocationDate: new Date(formData.allocationDate),
            goal: formData.goal,
            source: formData.source,
            status: formData.status,
            siteId: profile.siteId,
            smallGroupId: formData.smallGroupId,
            allocationType: 'hierarchical',
            bypassReason: null,
            allocatedById: kindeUser.id,
            notes: formData.notes,
            fromSiteId: formData.fromSiteId || profile.siteId,
            proofUrl: formData.proofUrl || null,
          },
          include: {
            allocatedBy: true,
            site: true,
            smallGroup: true,
            fromSite: true,
          }
        });

        return {
          id: allocation.id,
          amount: allocation.amount,
          allocationDate: allocation.allocationDate.toISOString(),
          goal: allocation.goal,
          source: allocation.source,
          status: allocation.status as any,
          allocatedById: allocation.allocatedById,
          siteId: allocation.siteId || undefined,
          smallGroupId: allocation.smallGroupId || undefined,
          notes: allocation.notes || undefined,
          allocationType: allocation.allocationType as 'hierarchical' | 'direct',
          bypassReason: allocation.bypassReason || undefined,
          allocatedByName: (allocation as any).allocatedBy.name,
          siteName: (allocation as any).site?.name,
          smallGroupName: (allocation as any).smallGroup?.name,
          fromSiteName: (allocation as any).fromSite?.name || 'National',
          fromSiteId: (allocation as any).fromSiteId || undefined,
          proofUrl: (allocation as any).proofUrl || undefined,
        };
      }
      else {
        throw new Error(`Forbidden: Role ${profile.role} cannot create allocations.`);
      }
    } catch (error: any) {
      console.error('[AllocationService] Create failed:', error.message);
      // Clean up storage if necessary
      if (formData.proofUrl) {
        const { deleteFile } = await import('@/services/storageService');
        await deleteFile(formData.proofUrl, { isRollback: true }).catch(() => { });
      }
      throw error;
    } finally {
      revalidatePath('/dashboard/finances');
    }
  }, { timeout: 20000 });
}
}

export async function updateAllocation(id: string, formData: Partial<FundAllocationFormData>): Promise<FundAllocation> {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  if (!kindeUser) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Fetch profile outside RLS
  const profile = await prisma.profile.findUnique({
    where: { id: kindeUser.id },
    select: { role: true }
  });

  if (!profile || profile.role !== 'NATIONAL_COORDINATOR') {
    throw new Error("Forbidden: Only National Coordinators can update allocations.");
  }

  return await withRLS(kindeUser.id, async () => {
    const updateData: any = {};
    if (formData.amount !== undefined) updateData.amount = formData.amount;
    if (formData.allocationDate) updateData.allocationDate = new Date(formData.allocationDate);
    if (formData.goal !== undefined) updateData.goal = formData.goal;
    if (formData.status !== undefined) updateData.status = formData.status;
    if (formData.notes !== undefined) updateData.notes = formData.notes;
    if (formData.fromSiteId !== undefined) updateData.fromSiteId = formData.fromSiteId;
    if (formData.proofUrl !== undefined) updateData.proofUrl = formData.proofUrl;

    // CRITICAL: Prevent changing core audit fields after creation
    // siteId and smallGroupId can be updated if necessary, but allocationType is fixed
    if (formData.allocationType !== undefined) {
      throw new Error("Audit Integrity Error: Cannot change allocationType after creation.");
    }

    // Explicitly handle bypassReason validation if it's being updated
    if (formData.bypassReason !== undefined) {
      // Fetch current allocation to check type
      const existing = await prisma.fundAllocation.findUnique({ where: { id }, select: { allocationType: true } });
      if (existing?.allocationType === 'direct') {
        if (!formData.bypassReason || formData.bypassReason.trim().length < 20) {
          throw new Error("Validation Error: Direct allocations require a justification of minimum 20 characters.");
        }
        updateData.bypassReason = formData.bypassReason;
      }
    }

    await prisma.fundAllocation.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/dashboard/finances');
    return getAllocationById(id);
  });
}

export async function deleteAllocation(id: string): Promise<void> {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();

  if (!kindeUser) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Fetch profile outside RLS
  const profile = await prisma.profile.findUnique({
    where: { id: kindeUser.id },
    select: { role: true }
  });

  if (!profile || profile.role !== 'NATIONAL_COORDINATOR') {
    throw new Error("Forbidden: Only National Coordinators can delete allocations.");
  }

  return await withRLS(kindeUser.id, async () => {
    await prisma.fundAllocation.delete({
      where: { id }
    });
    revalidatePath('/dashboard/finances');
  });
}
