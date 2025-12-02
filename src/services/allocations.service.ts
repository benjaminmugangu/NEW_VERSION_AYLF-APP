// src/services/allocations.service.ts
'use server';

import { prisma } from '@/lib/prisma';
import type { FundAllocation, FundAllocationFormData } from '@/lib/types';

export async function getAllocations(filters?: { siteId?: string; smallGroupId?: string }): Promise<FundAllocation[]> {
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
    },
    orderBy: {
      allocationDate: 'desc'
    }
  });

  return allocations.map(allocation => ({
    id: allocation.id,
    amount: allocation.amount,
    allocationDate: allocation.allocationDate.toISOString(),
    goal: allocation.goal,
    source: allocation.source,
    status: allocation.status,
    allocatedById: allocation.allocatedById,
    siteId: allocation.siteId,
    smallGroupId: allocation.smallGroupId,
    notes: allocation.notes,
    allocatedByName: allocation.allocatedBy.name,
    siteName: allocation.site?.name,
    smallGroupName: allocation.smallGroup?.name,
    sourceTransactionId: null, // Legacy field, not in new schema
    fromSiteId: allocation.fromSiteId,
    proofUrl: allocation.proofUrl,
  } as FundAllocation));
}

export async function getAllocationById(id: string): Promise<FundAllocation> {
  const allocation = await prisma.fundAllocation.findUnique({
    where: { id },
    include: {
      allocatedBy: true,
      site: true,
      smallGroup: true,
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
    status: allocation.status,
    allocatedById: allocation.allocatedById,
    siteId: allocation.siteId,
    smallGroupId: allocation.smallGroupId,
    notes: allocation.notes,
    allocatedByName: allocation.allocatedBy.name,
    siteName: allocation.site?.name,
    smallGroupName: allocation.smallGroup?.name,
    sourceTransactionId: null,
    fromSiteId: allocation.fromSiteId,
    proofUrl: allocation.proofUrl,
  } as FundAllocation;
}

export async function createAllocation(formData: FundAllocationFormData): Promise<FundAllocation> {
  const allocation = await prisma.fundAllocation.create({
    data: {
      amount: formData.amount,
      allocationDate: new Date(formData.allocationDate),
      goal: formData.goal,
      source: formData.source,
      status: formData.status,
      allocatedById: formData.allocatedById,
      siteId: formData.siteId || null,
      smallGroupId: formData.smallGroupId || null,
      notes: formData.notes,
      fromSiteId: formData.fromSiteId || null,
      proofUrl: formData.proofUrl || null,
    },
    include: {
      allocatedBy: true,
      site: true,
      smallGroup: true,
    }
  });

  return {
    id: allocation.id,
    amount: allocation.amount,
    allocationDate: allocation.allocationDate.toISOString(),
    goal: allocation.goal,
    source: allocation.source,
    status: allocation.status,
    allocatedById: allocation.allocatedById,
    siteId: allocation.siteId,
    smallGroupId: allocation.smallGroupId,
    notes: allocation.notes,
    allocatedByName: allocation.allocatedBy.name,
    siteName: allocation.site?.name,
    smallGroupName: allocation.smallGroup?.name,
    sourceTransactionId: null,
    fromSiteId: allocation.fromSiteId,
    proofUrl: allocation.proofUrl,
  } as FundAllocation;
}

export async function updateAllocation(id: string, formData: Partial<FundAllocationFormData>): Promise<FundAllocation> {
  const updateData: any = {};

  if (formData.amount !== undefined) updateData.amount = formData.amount;
  if (formData.allocationDate) updateData.allocationDate = new Date(formData.allocationDate);
  if (formData.goal !== undefined) updateData.goal = formData.goal;
  if (formData.source !== undefined) updateData.source = formData.source;
  if (formData.status !== undefined) updateData.status = formData.status;
  if (formData.siteId !== undefined) updateData.siteId = formData.siteId;
  if (formData.smallGroupId !== undefined) updateData.smallGroupId = formData.smallGroupId;
  if (formData.notes !== undefined) updateData.notes = formData.notes;
  if (formData.fromSiteId !== undefined) updateData.fromSiteId = formData.fromSiteId;
  if (formData.proofUrl !== undefined) updateData.proofUrl = formData.proofUrl;

  await prisma.fundAllocation.update({
    where: { id },
    data: updateData,
  });

  return getAllocationById(id);
}

export async function deleteAllocation(id: string): Promise<void> {
  await prisma.fundAllocation.delete({
    where: { id }
  });
}
