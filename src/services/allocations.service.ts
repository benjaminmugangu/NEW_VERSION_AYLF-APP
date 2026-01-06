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
import { checkPeriod } from './accountingService';
import { checkBudgetIntegrity } from './budgetService';
import { notifyBudgetOverrun } from './notificationService';

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

    const models = allocations.map((allocation: any) => ({
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
      allocatedByName: allocation.allocatedBy?.name,
      allocatedByAvatarUrl: allocation.allocatedBy?.avatarUrl,
      siteName: allocation.site?.name,
      smallGroupName: allocation.smallGroup?.name,
      fromSiteName: allocation.fromSite?.name || 'National',
      fromSiteId: allocation.fromSiteId || undefined,
      proofUrl: allocation.proofUrl || undefined,
    }));

    return signAllocationAvatars(models);
  });
}

/**
 * Batch sign avatars for a list of allocations
 */
async function signAllocationAvatars(allocations: FundAllocation[]): Promise<FundAllocation[]> {
  const filePaths = allocations
    .map(a => a.allocatedByAvatarUrl)
    .filter(url => url && !url.startsWith('http')) as string[];

  if (filePaths.length === 0) return allocations;

  try {
    const { getSignedUrls } = await import('./storageService');
    const signedUrls = await getSignedUrls(filePaths, 'avatars');
    allocations.forEach(a => {
      if (a.allocatedByAvatarUrl && signedUrls[a.allocatedByAvatarUrl]) {
        a.allocatedByAvatarUrl = signedUrls[a.allocatedByAvatarUrl];
      }
    });
  } catch (e) {
    console.warn('[AllocationService] Batch signing failed:', e);
  }
  return allocations;
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

    const model = {
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
      allocatedByName: allocation.allocatedBy?.name,
      allocatedByAvatarUrl: allocation.allocatedBy?.avatarUrl,
      siteName: allocation.site?.name,
      smallGroupName: allocation.smallGroup?.name,
      fromSiteName: allocation.fromSite?.name || 'National',
      fromSiteId: allocation.fromSiteId || undefined,
      proofUrl: allocation.proofUrl || undefined,
    };

    const signed = await signAllocationAvatars([model]);
    return signed[0];
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

        // ✅ Accounting Period Guard: Prevent creation in closed periods
        await checkPeriod(new Date(formData.allocationDate), 'Création d\'allocation');

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
          // ✅ Informative Phase: We no longer block allocations even if budget is insufficient.
          // The budget integrity check at the end of the service will trigger the necessary alerts.
          if (budget.available < Number(formData.amount)) {
            console.warn(`[AllocationService] SC ${profile.name} is initiating an allocation that exceeds site budget (${budget.available} < ${formData.amount}). Proceeding in informative mode.`);
          }

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

      // ✅ Real-time Budget Overrun Detection (Point 4)
      // If funds were sent FROM a site, check if that site is now in overrun
      if (profile.role === 'SITE_COORDINATOR' && profile.siteId) {
        try {
          // Pass the transaction client to checkBudgetIntegrity
          const integrity = await checkBudgetIntegrity({ siteId: profile.siteId }, basePrisma); // Use basePrisma for checkBudgetIntegrity outside the transaction
          if (integrity.isOverrun) {
            await notifyBudgetOverrun({
              siteId: profile.siteId,
              entityName: profile.site?.name || 'Site',
              balance: integrity.balance,
              tx: basePrisma
            });
          }
        } catch (e) {
          console.error('[BudgetAlert] Failed to check site budget integrity:', e);
        }
      }

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
    // Fetch existing allocation to check date
    const existing = await prisma.fundAllocation.findUnique({
      where: { id },
      select: { allocationDate: true, allocationType: true }
    });

    if (!existing) throw new Error('Allocation not found');

    // ✅ Accounting Period Guard: Check existing and new dates
    await checkPeriod(existing.allocationDate, 'Modification d\'allocation (existant)');
    if (formData.allocationDate) {
      await checkPeriod(new Date(formData.allocationDate), 'Modification d\'allocation (nouvelle date)');
    }

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

    const updated = await prisma.fundAllocation.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/dashboard/finances');

    // ✅ Real-time Budget Overrun Detection (Point 4)
    // If the amount was reduced or recipient changed, check the affected entities
    try {
      if (updated.siteId) {
        const siteIntegrity = await checkBudgetIntegrity({ siteId: updated.siteId }, basePrisma);
        if (siteIntegrity.isOverrun) {
          const site = await basePrisma.site.findUnique({ where: { id: updated.siteId }, select: { name: true } });
          await notifyBudgetOverrun({
            siteId: updated.siteId,
            entityName: site?.name || 'Site',
            balance: siteIntegrity.balance,
            tx: basePrisma
          });
        }
      }
      if (updated.smallGroupId) {
        const groupIntegrity = await checkBudgetIntegrity({ smallGroupId: updated.smallGroupId }, basePrisma);
        if (groupIntegrity.isOverrun) {
          const group = await basePrisma.smallGroup.findUnique({ where: { id: updated.smallGroupId }, select: { name: true } });
          await notifyBudgetOverrun({
            smallGroupId: updated.smallGroupId,
            entityName: group?.name || 'Petit Groupe',
            balance: groupIntegrity.balance,
            tx: basePrisma
          });
        }
      }
    } catch (e) {
      console.error('[BudgetAlert] Failed to check budget integrity after update:', e);
    }

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
    // Fetch deletion targets for budget alerts
    const target = await prisma.fundAllocation.findUnique({
      where: { id },
      select: { siteId: true, smallGroupId: true, allocationDate: true }
    });

    if (!target) throw new Error('Allocation not found');

    // ✅ Accounting Period Guard: Check date
    await checkPeriod(target.allocationDate, 'Suppression d\'allocation');

    await prisma.fundAllocation.delete({ where: { id } });

    revalidatePath('/dashboard/finances');

    // ✅ Real-time Budget Overrun Detection (Point 4)
    try {
      if (target.siteId && !target.smallGroupId) {
        const siteIntegrity = await checkBudgetIntegrity({ siteId: target.siteId }, basePrisma);
        if (siteIntegrity.isOverrun) {
          const site = await basePrisma.site.findUnique({ where: { id: target.siteId }, select: { name: true } });
          await notifyBudgetOverrun({
            siteId: target.siteId,
            entityName: site?.name || 'Site',
            balance: siteIntegrity.balance,
            tx: basePrisma
          });
        }
      } else if (target.smallGroupId) {
        const groupIntegrity = await checkBudgetIntegrity({ smallGroupId: target.smallGroupId }, basePrisma);
        if (groupIntegrity.isOverrun) {
          const group = await basePrisma.smallGroup.findUnique({ where: { id: target.smallGroupId }, select: { name: true } });
          await notifyBudgetOverrun({
            smallGroupId: target.smallGroupId,
            entityName: group?.name || 'Petit Groupe',
            balance: groupIntegrity.balance,
            tx: basePrisma
          });
        }
      }
    } catch (e) {
      console.error('[BudgetAlert] Failed to check budget integrity after deletion:', e);
    }
  });
}
