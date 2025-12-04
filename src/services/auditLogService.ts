'use server';

import { prisma } from '@/lib/prisma';

/**
 * Interface for AuditLog entry
 */
export interface AuditLogEntry {
    actorId: string;
    action: 'create' | 'update' | 'approve' | 'reject' | 'complete' | 'reverse' | 'delete';
    entityType: 'FundAllocation' | 'FinancialTransaction' | 'Report' | 'Activity';
    entityId: string;
    metadata?: {
        before?: any;
        after?: any;
        comment?: string;
        reason?: string;
        [key: string]: any;
    };
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry) {
    try {
        const auditLog = await prisma.auditLog.create({
            data: {
                actorId: entry.actorId,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                metadata: entry.metadata || {},
                ipAddress: entry.ipAddress,
                userAgent: entry.userAgent,
            },
        });

        return auditLog;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        throw new Error('Failed to create audit log entry');
    }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
    entityType: AuditLogEntry['entityType'],
    entityId: string
) {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                entityType,
                entityId,
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return logs;
    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        throw new Error('Failed to fetch audit logs');
    }
}

/**
 * Get audit logs by actor (user)
 */
export async function getAuditLogsByActor(actorId: string, limit = 50) {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                actorId,
            },
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });

        return logs;
    } catch (error) {
        console.error('Failed to fetch audit logs by actor:', error);
        throw new Error('Failed to fetch audit logs');
    }
}

/**
 * Get recent audit logs (for admin dashboard)
 */
export async function getRecentAuditLogs(limit = 100) {
    try {
        const logs = await prisma.auditLog.findMany({
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
        });

        return logs;
    } catch (error) {
        console.error('Failed to fetch recent audit logs:', error);
        throw new Error('Failed to fetch recent audit logs');
    }
}

/**
 * Helper: Log a transaction creation
 */
export async function logTransactionCreation(
    actorId: string,
    transactionId: string,
    transactionData: any,
    ipAddress?: string,
    userAgent?: string
) {
    return createAuditLog({
        actorId,
        action: 'create',
        entityType: 'FinancialTransaction',
        entityId: transactionId,
        metadata: {
            after: transactionData,
            comment: 'Transaction créée',
        },
        ipAddress,
        userAgent,
    });
}

/**
 * Helper: Log a transaction approval
 */
export async function logTransactionApproval(
    actorId: string,
    transactionId: string,
    before: any,
    after: any,
    ipAddress?: string,
    userAgent?: string
) {
    return createAuditLog({
        actorId,
        action: 'approve',
        entityType: 'FinancialTransaction',
        entityId: transactionId,
        metadata: {
            before,
            after,
            comment: 'Transaction approuvée',
        },
        ipAddress,
        userAgent,
    });
}

/**
 * Helper: Log a report approval
 */
export async function logReportApproval(
    actorId: string,
    reportId: string,
    before: any,
    after: any,
    generatedTransactionIds?: string[],
    ipAddress?: string,
    userAgent?: string
) {
    return createAuditLog({
        actorId,
        action: 'approve',
        entityType: 'Report',
        entityId: reportId,
        metadata: {
            before,
            after,
            generatedTransactions: generatedTransactionIds,
            comment: 'Rapport approuvé et transactions générées',
        },
        ipAddress,
        userAgent,
    });
}

/**
 * Helper: Log an allocation completion
 */
export async function logAllocationCompletion(
    actorId: string,
    allocationId: string,
    before: any,
    after: any,
    ipAddress?: string,
    userAgent?: string
) {
    return createAuditLog({
        actorId,
        action: 'complete',
        entityType: 'FundAllocation',
        entityId: allocationId,
        metadata: {
            before,
            after,
            comment: 'Allocation marquée comme complétée',
        },
        ipAddress,
        userAgent,
    });
}
