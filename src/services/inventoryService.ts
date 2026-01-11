'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export type CreateInventoryItemData = {
    name: string;
    description?: string;
    category?: string;
    unit?: string;
    siteId?: string;
};

export type CreateInventoryMovementData = {
    itemId: string;
    date: Date;
    direction: 'in' | 'out';
    quantity: number;
    reason?: string;
    relatedTransactionId?: string;
    relatedReportId?: string;
    siteId?: string;
    smallGroupId?: string;
};

export async function createInventoryItem(data: CreateInventoryItemData): Promise<ServiceResponse<any>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const item = await tx.inventoryItem.create({
                    data: {
                        name: data.name,
                        description: data.description,
                        category: data.category,
                        unit: data.unit,
                        siteId: data.siteId,
                    },
                    include: {
                        site: true,
                    },
                });

                // Audit Log
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'CREATE',
                        entityType: 'INVENTORY_ITEM',
                        entityId: item.id,
                        metadata: { name: item.name, siteId: item.siteId }
                    }
                });

                return item;
            });
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

export async function getInventoryItems(siteId?: string): Promise<ServiceResponse<any[]>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.inventoryItem.findMany({
                where: siteId ? { siteId } : {},
                include: {
                    site: {
                        select: { name: true },
                    },
                    movements: {
                        take: 5,
                        orderBy: { date: 'desc' },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

export async function getInventoryItemById(id: string): Promise<ServiceResponse<any>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            const item = await prisma.inventoryItem.findUnique({
                where: { id },
                include: {
                    site: true,
                    movements: {
                        orderBy: { date: 'desc' },
                    },
                },
            });

            if (!item) throw new Error('NOT_FOUND: Inventory item not found.');
            return item;
        });

        return { success: true, data: result };
    } catch (error: any) {
        let code = ErrorCode.INTERNAL_ERROR;
        if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
        return { success: false, error: { message: error.message, code } };
    }
}

export async function updateInventoryItem(id: string, data: Partial<CreateInventoryItemData>): Promise<ServiceResponse<any>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const oldItem = await tx.inventoryItem.findUnique({ where: { id } });
                if (!oldItem) throw new Error('NOT_FOUND: Inventory item not found.');

                const item = await tx.inventoryItem.update({
                    where: { id },
                    data: {
                        name: data.name,
                        description: data.description,
                        category: data.category,
                        unit: data.unit,
                    },
                });

                // Audit Log
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'UPDATE',
                        entityType: 'INVENTORY_ITEM',
                        entityId: id,
                        metadata: { before: oldItem, after: item }
                    }
                });

                return item;
            });
        });

        return { success: true, data: result };
    } catch (error: any) {
        let code = ErrorCode.INTERNAL_ERROR;
        if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
        return { success: false, error: { message: error.message, code } };
    }
}

export async function deleteInventoryItem(id: string): Promise<ServiceResponse<void>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        await withRLS(user.id, async () => {
            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const item = await tx.inventoryItem.findUnique({ where: { id } });
                if (!item) throw new Error('NOT_FOUND: Inventory item not found.');

                await tx.inventoryItem.delete({ where: { id } });

                // Audit Log
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'DELETE',
                        entityType: 'INVENTORY_ITEM',
                        entityId: id,
                        metadata: { name: item.name, siteId: item.siteId }
                    }
                });
            });
        });

        return { success: true };
    } catch (error: any) {
        let code = ErrorCode.INTERNAL_ERROR;
        if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
        return { success: false, error: { message: error.message, code } };
    }
}

export async function createInventoryMovement(data: CreateInventoryMovementData): Promise<ServiceResponse<any>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const movement = await tx.inventoryMovement.create({
                    data: {
                        itemId: data.itemId,
                        date: data.date,
                        direction: data.direction,
                        quantity: new Prisma.Decimal(data.quantity),
                        reason: data.reason,
                        relatedTransactionId: data.relatedTransactionId,
                        relatedReportId: data.relatedReportId,
                        siteId: data.siteId,
                        smallGroupId: data.smallGroupId,
                    },
                });

                // Audit Log
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'CREATE',
                        entityType: 'INVENTORY_MOVEMENT',
                        entityId: movement.id,
                        metadata: { itemId: data.itemId, direction: data.direction, quantity: data.quantity }
                    }
                });

                return movement;
            });
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

export async function getInventoryMovements(itemId?: string, siteId?: string): Promise<ServiceResponse<any[]>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.inventoryMovement.findMany({
                where: {
                    ...(itemId && { itemId }),
                    ...(siteId && { siteId }),
                },
                include: {
                    item: {
                        select: { name: true, unit: true },
                    },
                },
                orderBy: { date: 'desc' },
            });
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

export async function getCurrentStock(itemId: string): Promise<ServiceResponse<number>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            const movements = await prisma.inventoryMovement.findMany({
                where: { itemId },
            });

            const stock = movements.reduce((total: number, movement: any) => {
                const quantity = Number(movement.quantity);
                return movement.direction === 'in'
                    ? total + quantity
                    : total - quantity;
            }, 0);

            return stock;
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}
