'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

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
 * Primarily internal method.
 */
export async function createAuditLog(entry: AuditLogEntry, tx?: any) {
    const client = tx || prisma;
    try {
        const auditLog = await client.auditLog.create({
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
    } catch (error: any) {
        console.error('[CREATE_AUDIT_LOG_FAILED]', error.message);
        throw new Error('Failed to create audit log entry');
    }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
    entityType: AuditLogEntry['entityType'],
    entityId: string
): Promise<ServiceResponse<any[]>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.auditLog.findMany({
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
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

/**
 * Get audit logs by actor (user)
 */
export async function getAuditLogsByActor(actorId: string, limit = 50): Promise<ServiceResponse<any[]>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.auditLog.findMany({
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
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

/**
 * Get recent audit logs (for admin dashboard)
 */
export async function getRecentAuditLogs(limit = 100): Promise<ServiceResponse<any[]>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        const result = await withRLS(user.id, async () => {
            return await prisma.auditLog.findMany({
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
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

// Helper methods remain direct as they are used internal to other service methods
export async function logTransactionCreation(actorId: string, transactionId: string, transactionData: any, ipAddress?: string, userAgent?: string, tx?: any) {
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
    }, tx);
}

export async function logTransactionApproval(actorId: string, transactionId: string, before: any, after: any, ipAddress?: string, userAgent?: string, tx?: any) {
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
    }, tx);
}

export async function logReportApproval(actorId: string, reportId: string, before: any, after: any, generatedTransactionIds?: string[], ipAddress?: string, userAgent?: string, tx?: any) {
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
    }, tx);
}

export async function logAllocationCompletion(actorId: string, allocationId: string, before: any, after: any, ipAddress?: string, userAgent?: string, tx?: any) {
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
    }, tx);
}

export async function logReportRejection(actorId: string, reportId: string, before: any, after: any, reason: string, ipAddress?: string, userAgent?: string, tx?: any) {
    return createAuditLog({
        actorId,
        action: 'reject',
        entityType: 'Report',
        entityId: reportId,
        metadata: {
            before,
            after,
            reason,
            comment: 'Rapport rejeté',
        },
        ipAddress,
        userAgent,
    }, tx);
}

export async function logActivityCreation(actorId: string, activityId: string, activityData: any, ipAddress?: string, userAgent?: string, tx?: any) {
    return createAuditLog({
        actorId,
        action: 'create',
        entityType: 'Activity',
        entityId: activityId,
        metadata: {
            after: activityData,
            comment: 'Activité créée',
        },
        ipAddress,
        userAgent,
    }, tx);
}

export async function logActivityUpdate(actorId: string, activityId: string, before: any, after: any, ipAddress?: string, userAgent?: string, tx?: any) {
    return createAuditLog({
        actorId,
        action: 'update',
        entityType: 'Activity',
        entityId: activityId,
        metadata: {
            before,
            after,
            comment: 'Activité mise à jour',
        },
        ipAddress,
        userAgent,
    }, tx);
}

export async function logActivityDeletion(actorId: string, activityId: string, before: any, ipAddress?: string, userAgent?: string, tx?: any) {
    return createAuditLog({
        actorId,
        action: 'delete',
        entityType: 'Activity',
        entityId: activityId,
        metadata: {
            before,
            comment: 'Activité supprimée',
        },
        ipAddress,
        userAgent,
    }, tx);
}
