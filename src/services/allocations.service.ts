// src/services/allocations.service.ts
'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import type { FundAllocation, FundAllocationFormData, ServiceResponse } from '@/lib/types';
import { calculateAvailableBudget } from './budgetService';
import { revalidatePath } from 'next/cache';
import notificationService from './notificationService';
import { ROLES } from '@/lib/constants';
import { UserRole } from '@prisma/client';

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

// ... (other exports)

export async function createAllocation(formData: FundAllocationFormData): Promise<ServiceResponse<FundAllocation>> {
  try {
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser) {
      return { success: false, error: { message: "Unauthorized: User not authenticated" } };
    }

    // 1. Fetch profile using basePrisma to bypass RLS for role check
    const profile = await basePrisma.profile.findUnique({
      where: { id: kindeUser.id },
      select: { role: true, siteId: true, name: true }
    });

    if (!profile) {
      return { success: false, error: { message: `User profile not found for user ${kindeUser.id}` } };
    }

    // 2. Wrap entire logic in withRLS to ensure store is set for secondary calls
    return await withRLS(kindeUser.id, async () => {
      console.log(`[AllocationService] Starting transaction for ${profile.role}`);

      const result = await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context at the start of the transaction session
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${kindeUser.id}'`);

        // NC Logic
        if (profile.role === 'NATIONAL_COORDINATOR') {
          if (!formData.isDirect) {
            // Hierarchical
            if (!formData.siteId) throw new Error("Hierarchical allocation requires a target Site");

            const allocation = await tx.fundAllocation.create({
              data: {
                amount: Number(formData.amount),
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
              include: { allocatedBy: true, site: true, smallGroup: true, fromSite: true }
            });

            // Notify Site Coordinator
            if (formData.siteId) {
              const sc = await tx.profile.findFirst({
                where: { siteId: formData.siteId, role: ROLES.SITE_COORDINATOR }
              });
              if (sc) {
                await notificationService.notifyAllocationReceived(
                  sc.id,
                  Number(formData.amount),
                  'Coordination Nationale',
                  tx
                );
              }
            }

            return mapDBAllocationToModel(allocation);
          } else {
            // Direct
            if (!formData.smallGroupId) throw new Error("Direct allocation requires a target Small Group");
            if (!formData.bypassReason || formData.bypassReason.trim().length < 20) {
              throw new Error("Direct allocations require a detailed justification (min 20 chars).");
            }

            const smallGroup = await tx.smallGroup.findUnique({
              where: { id: formData.smallGroupId },
              include: { site: true }
            });

            if (!smallGroup) throw new Error("Small Group not found");

            const allocation = await tx.fundAllocation.create({
              data: {
                amount: Number(formData.amount),
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
              include: { allocatedBy: true, site: true, smallGroup: true, fromSite: true }
            });

            // Audit & Notification
            await tx.auditLog.create({
              data: {
                actorId: kindeUser.id,
                action: 'create',
                entityType: 'FundAllocation',
                entityId: allocation.id,
                metadata: { type: 'direct_allocation', targetGroup: smallGroup.name },
                createdAt: new Date()
              }
            });

            // Notify Group Leader
            if (smallGroup.leaderId) {
              await notificationService.notifyAllocationReceived(
                smallGroup.leaderId,
                Number(formData.amount),
                'Coordination Nationale (Direct)',
                tx
              );
            }

            // Notify Site Coordinator about the bypass
            const sc = await tx.profile.findFirst({ where: { siteId: smallGroup.siteId, role: ROLES.SITE_COORDINATOR } });
            if (sc?.id) {
              await notificationService.createNotification({
                userId: sc.id,
                type: 'BUDGET_ALERT',
                title: '⚠️ Allocation Directe au Groupe',
                message: `La Coordination Nationale a alloué ${Number(formData.amount)} FC directement au groupe "${smallGroup.name}".`,
                link: `/dashboard/finances/allocations/${allocation.id}`,
              }, tx);
            }

            return mapDBAllocationToModel(allocation);
          }
        }
        // SC Logic
        else if (profile.role === 'SITE_COORDINATOR') {
          if (!profile.siteId || !formData.smallGroupId) throw new Error("Invalid SC allocation parameters");

          const smallGroup = await tx.smallGroup.findUnique({ where: { id: formData.smallGroupId } });
          if (!smallGroup || smallGroup.siteId !== profile.siteId) throw new Error("Invalid target Small Group");

          const budget = await calculateAvailableBudget({ siteId: profile.siteId }, tx);
          if (budget.available < Number(formData.amount)) throw new Error("Insufficient budget");

          const allocation = await tx.fundAllocation.create({
            data: {
              amount: Number(formData.amount),
              allocationDate: new Date(formData.allocationDate),
              goal: formData.goal,
              source: formData.source,
              status: formData.status,
              siteId: profile.siteId,
              smallGroupId: formData.smallGroupId,
              allocationType: 'hierarchical',
              allocatedById: kindeUser.id,
              notes: formData.notes,
              fromSiteId: profile.siteId,
              proofUrl: formData.proofUrl || null,
            },
            include: { allocatedBy: true, site: true, smallGroup: true, fromSite: true }
          });

          // Notify Small Group Leader
          if (smallGroup.leaderId) {
            await notificationService.notifyAllocationReceived(
              smallGroup.leaderId,
              Number(formData.amount),
              `Site: ${profile.name || 'Votre Site'}`,
              tx
            );
          }

          return mapDBAllocationToModel(allocation);
        } else {
          throw new Error("Forbidden: Role not authorized for allocations");
        }
      }, { timeout: 30000 });

      revalidatePath('/dashboard/finances');
      return { success: true, data: result };
    });
  } catch (error: any) {
    console.error(`[AllocationService] FATAL: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

// Helper for deep serialization
function mapDBAllocationToModel(a: any): FundAllocation {
  return {
    id: a.id,
    amount: Number(a.amount),
    allocationDate: a.allocationDate.toISOString(),
    goal: a.goal,
    source: a.source,
    status: a.status as any,
    allocatedById: a.allocatedById,
    siteId: a.siteId || undefined,
    smallGroupId: a.smallGroupId || undefined,
    notes: a.notes || undefined,
    allocationType: a.allocationType as any,
    bypassReason: a.bypassReason || undefined,
    allocatedByName: a.allocatedBy?.name || 'Unknown',
    siteName: a.site?.name,
    smallGroupName: a.smallGroup?.name,
    fromSiteName: a.fromSite?.name || 'National',
    fromSiteId: a.fromSiteId || undefined,
    proofUrl: a.proofUrl || undefined,
  };
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
