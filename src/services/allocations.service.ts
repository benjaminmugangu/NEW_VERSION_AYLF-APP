// src/services/allocations.service.ts
'use server';

import { prisma, withRLS } from '@/lib/prisma';
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

  // CRITICAL: Wrap write operations with RLS context
  return await withRLS(kindeUser.id, async () => {

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

        try {
          const allocation = await prisma.fundAllocation.create({
            data: {
              amount: formData.amount,
              allocationDate: new Date(formData.allocationDate),
              goal: formData.goal,
              source: formData.source,
              status: formData.status,
              siteId: formData.siteId,
              smallGroupId: null, // Explicitly null for hierarchical
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

          revalidatePath('/dashboard/finances');
          return getAllocationById(allocation.id);
        } catch (error) {
          console.error('[AllocationService] Create failed, rolling back assets...', error);
          if (formData.proofUrl) {
            const { deleteFile } = await import('@/services/storageService');
            await deleteFile(formData.proofUrl, { isRollback: true }).catch(err =>
              console.error('[AllocationService] Rollback failed:', err)
            );
          }
          throw error;
        }
      }

      // Case 2: Direct Allocation (NC → Small Group) - EXCEPTIONAL
      else {
        if (!formData.smallGroupId) {
          throw new Error("Direct allocation requires a target Small Group");
        }

        if (!formData.bypassReason || formData.bypassReason.trim().length < 20) {
          throw new Error("Direct allocations require a detailed justification (minimum 20 characters). This is for audit purposes.");
        }

        // Fetch Small Group with parent Site
        const smallGroup = await prisma.smallGroup.findUnique({
          where: { id: formData.smallGroupId },
          include: { site: true }
        });

        if (!smallGroup) {
          throw new Error("Small Group not found");
        }

        // Create allocation, audit log, and notification in a single transaction
        try {
          const result = await prisma.$transaction(async (tx: any) => {
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
                bypassReason: formData.bypassReason, // Mandatory for direct
                allocatedById: kindeUser.id,
                notes: formData.notes,
                fromSiteId: formData.fromSiteId || null,
                proofUrl: formData.proofUrl || null,
              },
              include: {
                allocatedBy: true,
                site: true, // Need site to get SC for notification (via relationship or subsequent query)
                smallGroup: true,
                fromSite: true,
              }
            });

            // 2. Create Audit Log (Resilience Traceability)
            await tx.auditLog.create({
              data: {
                actorId: kindeUser.id,
                action: 'create',
                entityType: 'FundAllocation',
                entityId: allocation.id,
                metadata: {
                  type: 'direct_allocation',
                  bypassReason: formData.bypassReason,
                  amount: formData.amount,
                  targetGroup: smallGroup.name,
                  bypassedSiteId: smallGroup.siteId
                },
                createdAt: new Date()
              }
            });

            // 3. Notify Site Coordinator (Resilience Visibility)
            const siteCoordinator = await tx.member.findFirst({
              where: {
                siteId: smallGroup.siteId,
                type: 'SITE_COORDINATOR'
              },
              include: { user: true }
            });

            if (siteCoordinator && siteCoordinator.userId) {
              await tx.notification.create({
                data: {
                  userId: siteCoordinator.userId,
                  type: 'BUDGET_ALERT', // Using closest type, or add NEW_ALLOCATION_BYPASS
                  title: '⚠️ Allocation Directe (Bypass)',
                  message: `Le NC a alloué ${new Intl.NumberFormat('fr-FR').format(formData.amount)} FC directement au groupe "${smallGroup.name}". Raison: ${formData.bypassReason}`,
                  link: `/dashboard/finances/allocations/${allocation.id}`,
                  read: false,
                  createdAt: new Date()
                }
              });
            }

            return allocation;
          });

          revalidatePath('/dashboard/finances');
          return getAllocationById(result.id);
        } catch (error) {
          console.error('[AllocationService] Direct Allocation failed, rolling back assets...', error);
          if (formData.proofUrl) {
            const { deleteFile } = await import('@/services/storageService');
            await deleteFile(formData.proofUrl, { isRollback: true }).catch(err =>
              console.error('[AllocationService] Rollback failed:', err)
            );
          }
          throw error;
        }
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

      // Verify Small Group belongs to SC's site
      const smallGroup = await prisma.smallGroup.findUnique({
        where: { id: formData.smallGroupId },
        select: { siteId: true, name: true }
      });

      if (!smallGroup || smallGroup.siteId !== profile.siteId) {
        throw new Error("Cannot allocate to Small Group from another site");
      }

      // Budget validation: Check if site has sufficient funds
      if (formData.fromSiteId || profile.siteId) {
        const budget = await calculateAvailableBudget({ siteId: formData.fromSiteId || profile.siteId });
        if (budget.available < formData.amount) {
          throw new Error(`Insufficient budget. Available: ${budget.available.toFixed(2)} FCFA`);
        }
      }

      try {
        const allocation = await prisma.fundAllocation.create({
          data: {
            amount: formData.amount,
            allocationDate: new Date(formData.allocationDate),
            goal: formData.goal,
            source: formData.source,
            status: formData.status,
            siteId: profile.siteId,     // SC's site
            smallGroupId: formData.smallGroupId,
            allocationType: 'hierarchical', // SC is always hierarchical
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

        revalidatePath('/dashboard/finances');
        return getAllocationById(allocation.id);
      } catch (error) {
        console.error('[AllocationService] SC Creation failed, rolling back assets...', error);
        if (formData.proofUrl) {
          const { deleteFile } = await import('@/services/storageService');
          await deleteFile(formData.proofUrl, { isRollback: true }).catch(err =>
            console.error('[AllocationService] Rollback failed:', err)
          );
        }
        throw error;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // OTHER ROLES - FORBIDDEN
    // ═══════════════════════════════════════════════════════════
    // OTHER ROLES - FORBIDDEN
    // ═══════════════════════════════════════════════════════════
    else {
      throw new Error(`Forbidden: Only National Coordinators and Site Coordinators can create fund allocations. Your role: ${profile.role}`);
    }
  }); // End withRLS wrapper
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
