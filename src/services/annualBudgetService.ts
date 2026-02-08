// src/services/annualBudgetService.ts
'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { ServiceResponse, ErrorCode, AnnualBudget, AnnualBudgetFormData } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all annual budgets.
 */
export async function getAnnualBudgets(): Promise<ServiceResponse<AnnualBudget[]>> {
    try {
        const budgets = await basePrisma.annualBudget.findMany({
            orderBy: { year: 'desc' }
        });

        const models = budgets.map((b: any) => ({
            id: b.id,
            year: b.year,
            totalAmount: Number(b.totalAmount),
            currency: b.currency,
            status: b.status as 'active' | 'closed',
            description: b.description || undefined,
            createdById: b.createdById,
            createdAt: b.createdAt.toISOString(),
            updatedAt: b.updatedAt.toISOString(),
        }));

        return { success: true, data: models };
    } catch (error: any) {
        console.error('[AnnualBudgetService] Error fetching budgets:', error);
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

/**
 * Create or Update an annual budget.
 */
export async function upsertAnnualBudget(formData: AnnualBudgetFormData): Promise<ServiceResponse<AnnualBudget>> {
    try {
        const { getUser } = getKindeServerSession();
        const kindeUser = await getUser();
        if (!kindeUser) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        // Role check (National Coordinator only)
        const profile = await basePrisma.profile.findUnique({
            where: { id: kindeUser.id },
            select: { role: true }
        });

        if (profile?.role !== 'NATIONAL_COORDINATOR') {
            return { success: false, error: { message: 'Forbidden: Only NC can manage budget anchors.', code: ErrorCode.FORBIDDEN } };
        }

        const budget = await basePrisma.annualBudget.upsert({
            where: { year: formData.year },
            update: {
                totalAmount: formData.totalAmount,
                description: formData.description,
                status: formData.status || 'active',
            },
            create: {
                year: formData.year,
                totalAmount: formData.totalAmount,
                currency: formData.currency || 'USD',
                description: formData.description,
                status: formData.status || 'active',
                createdById: kindeUser.id,
            },
        });

        // Audit Log
        await basePrisma.auditLog.create({
            data: {
                actorId: kindeUser.id,
                action: 'upsert',
                entityType: 'AnnualBudget',
                entityId: budget.id,
                metadata: { year: formData.year, amount: formData.totalAmount },
            }
        });

        revalidatePath('/dashboard/finances');

        return {
            success: true,
            data: {
                ...budget,
                totalAmount: Number(budget.totalAmount),
                status: budget.status as 'active' | 'closed',
                createdAt: budget.createdAt.toISOString(),
                updatedAt: budget.updatedAt.toISOString(),
            } as AnnualBudget
        };
    } catch (error: any) {
        console.error('[AnnualBudgetService] Error saving budget:', error);
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}
