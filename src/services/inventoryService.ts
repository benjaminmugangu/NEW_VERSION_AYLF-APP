'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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

export async function createInventoryItem(data: CreateInventoryItemData) {
    return await prisma.inventoryItem.create({
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
}

export async function getInventoryItems(siteId?: string) {
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
}

export async function getInventoryItemById(id: string) {
    return await prisma.inventoryItem.findUnique({
        where: { id },
        include: {
            site: true,
            movements: {
                orderBy: { date: 'desc' },
            },
        },
    });
}

export async function updateInventoryItem(id: string, data: Partial<CreateInventoryItemData>) {
    return await prisma.inventoryItem.update({
        where: { id },
        data: {
            name: data.name,
            description: data.description,
            category: data.category,
            unit: data.unit,
        },
    });
}

export async function deleteInventoryItem(id: string) {
    return await prisma.inventoryItem.delete({
        where: { id },
    });
}

export async function createInventoryMovement(data: CreateInventoryMovementData) {
    // Relational Consistency Guard: If smallGroupId is provided, ensure siteId is also present
    // Often siteId is the owner of the item, but movements can be scoped to a group.

    return await prisma.inventoryMovement.create({
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
}

export async function getInventoryMovements(itemId?: string, siteId?: string) {
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
}

export async function getCurrentStock(itemId: string): Promise<number> {
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
}
