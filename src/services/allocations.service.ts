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
import { batchSignAvatars } from './enrichmentService';
import { deleteFile, extractFilePath } from './storageService';

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

    return batchSignAvatars(models, ['allocatedByAvatarUrl']);
  });
}

/**
 * Batch sign avatars for a list of allocations
 */
// signAllocationAvatars is now centralized in enrichmentService.ts

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

    const signed = await batchSignAvatars([model], ['allocatedByAvatarUrl']);
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
      return { success: false, error: { message: "Profile not found" } };
    }

    // 1b. Idempotency Check (Pre-Transaction)
    if (formData.idempotencyKey) {
      const existingKey = await basePrisma.idempotencyKey.findUnique({
        where: { key: formData.idempotencyKey }
      });
      if (existingKey) {
        return { success: true, data: existingKey.response as any };
      }
    }

    // 2. Wrap entire logic in withRLS to ensure store is set for secondary calls
    const result = await withRLS(kindeUser.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context at the start of the transaction session
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${kindeUser.id}'`);

        // ✅ Accounting Period Guard: Prevent creation in closed periods
        await checkPeriod(new Date(formData.allocationDate), 'Création d\'allocation');

        // NC Logic
        if (profile.role === 'NATIONAL_COORDINATOR') {
          if (!formData.isDirect) {
            // Hierarchical
            if (formData.smallGroupId) throw new Error("Hierarchical NC allocation must target a Site ONLY");
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
              throw new Error("Direct allocations require a detailed justification (minimum 20 characters).");
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
          if (!profile.siteId) throw new Error("Site Coordinator has no assigned site");
          if (!formData.smallGroupId) throw new Error("Site Coordinator must allocate to a Small Group");

          const smallGroup = await tx.smallGroup.findUnique({ where: { id: formData.smallGroupId } });
          if (!smallGroup) throw new Error("Invalid target Small Group");
          if (smallGroup.siteId !== profile.siteId) throw new Error("Cannot allocate to Small Group from another site");

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
              bypassReason: null,
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

          const model = mapDBAllocationToModel(allocation);

          // ✅ Save Idempotency Key inside transaction
          if (formData.idempotencyKey) {
            await tx.idempotencyKey.upsert({
              where: { key: formData.idempotencyKey },
              create: {
                key: formData.idempotencyKey,
                response: model as any
              },
              update: {
                response: model as any
              }
            });
          }

          return model;
        } else {
          throw new Error("Only National Coordinators and Site Coordinators can create allocations.");
        }
      }, { timeout: 30000 });
    });

    return { success: true, data: result };
  } catch (error: any) {
    if (formData.proofUrl) {
      console.error('[CreateAllocation] Database failure, initiating rollback for proofUrl...', error);
      await deleteFile(extractFilePath(formData.proofUrl, 'report-images'), { isRollback: true }).catch(err =>
        console.error('[CreateAllocation] Critical: Asset rollback failed:', err)
      );
    }
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
    smallGroupId: a.smallGroupId,
    notes: a.notes,
    allocationType: a.allocationType as any,
    bypassReason: a.bypassReason,
    allocatedByName: a.allocatedBy?.name || 'Unknown',
    siteName: a.site?.name,
    smallGroupName: a.smallGroup?.name,
    fromSiteName: a.fromSite?.name || 'National',
    fromSiteId: a.fromSiteId,
    proofUrl: a.proofUrl,
  };
}



export async function updateAllocation(id: string, formData: Partial<FundAllocationFormData>): Promise<ServiceResponse<FundAllocation>> {
  try {
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser) {
      return { success: false, error: { message: "Unauthorized: User not authenticated" } };
    }

    // Fetch profile outside RLS
    const profile = await basePrisma.profile.findUnique({
      where: { id: kindeUser.id },
      select: { role: true }
    });

    if (!profile || profile.role !== 'NATIONAL_COORDINATOR') {
      return { success: false, error: { message: "Only National Coordinators can update allocations." } };
    }

    const result = await withRLS(kindeUser.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // 1. Manually set RLS context for this transaction session
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${kindeUser.id}'`);

        // 2. Fetch existing allocation inside transaction
        const existing = await tx.fundAllocation.findUnique({
          where: { id },
          include: { site: true, smallGroup: true, allocatedBy: true }
        });

        console.log('[AllocationService] DEBUG: existing allocation found:', !!existing);
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
        if (formData.allocationType !== undefined) {
          throw new Error("Audit Integrity Error: Cannot change allocationType after creation.");
        }

        // Explicitly handle bypassReason validation
        if (formData.bypassReason !== undefined && existing.allocationType === 'direct') {
          if (!formData.bypassReason || formData.bypassReason.trim().length < 20) {
            throw new Error("Validation Error: Direct allocations require a justification of minimum 20 characters.");
          }
          updateData.bypassReason = formData.bypassReason;
        }

        const updated = await tx.fundAllocation.update({
          where: { id },
          data: updateData,
          include: { site: true, smallGroup: true, allocatedBy: true, fromSite: true }
        });

        // 3. Audit Log inside the transaction
        await tx.auditLog.create({
          data: {
            actorId: kindeUser.id,
            action: 'update',
            entityType: 'FundAllocation',
            entityId: id,
            metadata: { before: existing, after: updated },
            createdAt: new Date()
          }
        });

        revalidatePath('/dashboard/finances');

        // ✅ Real-time Budget Overrun Detection
        try {
          if (updated.siteId) {
            const siteIntegrity = await checkBudgetIntegrity({ siteId: updated.siteId }, tx);
            if (siteIntegrity.isOverrun) {
              const site = await tx.site.findUnique({ where: { id: updated.siteId }, select: { name: true } });
              await notifyBudgetOverrun({
                siteId: updated.siteId,
                entityName: site?.name || 'Site',
                balance: siteIntegrity.balance,
                tx
              });
            }
          }
          if (updated.smallGroupId) {
            const groupIntegrity = await checkBudgetIntegrity({ smallGroupId: updated.smallGroupId }, tx);
            if (groupIntegrity.isOverrun) {
              const group = await tx.smallGroup.findUnique({ where: { id: updated.smallGroupId }, select: { name: true } });
              await notifyBudgetOverrun({
                smallGroupId: updated.smallGroupId,
                entityName: group?.name || 'Petit Groupe',
                balance: groupIntegrity.balance,
                tx
              });
            }
          }
        } catch (e) {
          console.error('[BudgetAlert] Failed to check budget integrity after update:', e);
        }

        return mapDBAllocationToModel(updated);
      }, { timeout: 15000 });
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[AllocationService] Update FATAL ERROR:', error);
    console.error(`[AllocationService] Update Error: ${error.message}`);
    return { success: false, error: { message: error.message } };
  }
}

export async function deleteAllocation(id: string): Promise<ServiceResponse<void>> {
  try {
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser) {
      return { success: false, error: { message: "Unauthorized: User not authenticated" } };
    }

    // Fetch profile outside RLS
    const profile = await basePrisma.profile.findUnique({
      where: { id: kindeUser.id },
      select: { role: true }
    });

    if (!profile || profile.role !== 'NATIONAL_COORDINATOR') {
      return { success: false, error: { message: "Forbidden: Only National Coordinators can delete allocations." } };
    }

    await withRLS(kindeUser.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // 1. Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${kindeUser.id}'`);

        // 2. Fetch targets inside transaction
        const target = await tx.fundAllocation.findUnique({
          where: { id },
          select: { siteId: true, smallGroupId: true, allocationDate: true, amount: true, goal: true }
        });

        if (!target) throw new Error('Allocation not found');

        // ✅ Accounting Period Guard
        await checkPeriod(target.allocationDate, 'Suppression d\'allocation');

        // 3. Mutation
        await tx.fundAllocation.delete({ where: { id } });

        // 4. Audit Log
        await tx.auditLog.create({
          data: {
            actorId: kindeUser.id,
            action: 'delete',
            entityType: 'FundAllocation',
            entityId: id,
            metadata: { before: target, comment: 'Allocation supprimée' },
            createdAt: new Date()
          }
        });

        revalidatePath('/dashboard/finances');

        // ✅ Real-time Budget Overrun Detection
        try {
          if (target.siteId) {
            const siteIntegrity = await checkBudgetIntegrity({ siteId: target.siteId }, tx);
            if (siteIntegrity.isOverrun) {
              const site = await tx.site.findUnique({ where: { id: target.siteId }, select: { name: true } });
              await notifyBudgetOverrun({
                siteId: target.siteId,
                entityName: site?.name || 'Site',
                balance: siteIntegrity.balance,
                tx
              });
            }
          }
          if (target.smallGroupId) {
            const groupIntegrity = await checkBudgetIntegrity({ smallGroupId: target.smallGroupId }, tx);
            if (groupIntegrity.isOverrun) {
              const group = await tx.smallGroup.findUnique({ where: { id: target.smallGroupId }, select: { name: true } });
              await notifyBudgetOverrun({
                smallGroupId: target.smallGroupId,
                entityName: group?.name || 'Petit Groupe',
                balance: groupIntegrity.balance,
                tx
              });
            }
          }
        } catch (e) {
          console.error('[BudgetAlert] Failed to check budget integrity after deletion:', e);
        }
      }, { timeout: 15000 });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: { message: error.message } };
  }
}
