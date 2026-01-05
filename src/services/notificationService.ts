import { prisma } from '@/lib/prisma';

export type NotificationType =
    | 'REPORT_APPROVED'
    | 'REPORT_REJECTED'
    | 'ALLOCATION_RECEIVED'
    | 'ACTIVITY_REMINDER'
    | 'BUDGET_ALERT'
    | 'NEW_REPORT'
    | 'USER_INVITED';

export interface CreateNotificationData {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: any;
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    metadata: any | null;
    read: boolean;
    createdAt: Date;
}

/**
 * Create a new notification for a user
 */
export async function createNotification(data: CreateNotificationData, tx?: any): Promise<Notification> {
    const client = tx || prisma;
    return await (client as any).notification.create({
        data: {
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link || null,
            metadata: data.metadata || null,
        },
    });
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
    userId: string,
    options?: {
        unreadOnly?: boolean;
        limit?: number;
    }
): Promise<Notification[]> {
    const where: any = { userId };

    if (options?.unreadOnly) {
        where.read = false;
    }

    return await (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
    });
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return await (prisma as any).notification.count({
        where: {
            userId,
            read: false,
        },
    });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
    return await (prisma as any).notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
    const result = await (prisma as any).notification.updateMany({
        where: {
            userId,
            read: false,
        },
        data: { read: true },
    });

    return result.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    await (prisma as any).notification.delete({
        where: { id: notificationId },
    });
}

/**
 * Delete old read notifications (cleanup utility)
 */
export async function deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await (prisma as any).notification.deleteMany({
        where: {
            read: true,
            createdAt: {
                lt: cutoffDate,
            },
        },
    });

    return result.count;
}

// ----- Helper functions for common notification scenarios -----

/**
 * Notify when a report is approved
 */
export async function notifyReportApproved(
    submitterId: string,
    reportTitle: string,
    reportId: string,
    tx?: any
): Promise<Notification> {
    return createNotification({
        userId: submitterId,
        type: 'REPORT_APPROVED',
        title: '✅ Rapport Approuvé!',
        message: `Votre rapport "${reportTitle}" a été approuvé.`,
        link: `/dashboard/reports/${reportId}`,
        metadata: { reportId, reportTitle }
    }, tx);
}

/**
 * Notify when a report is rejected
 */
export async function notifyReportRejected(
    submitterId: string,
    reportTitle: string,
    reportId: string,
    reason?: string,
    tx?: any
): Promise<Notification> {
    return createNotification({
        userId: submitterId,
        type: 'REPORT_REJECTED',
        title: '❌ Rapport Rejeté',
        message: `Votre rapport "${reportTitle}" a été rejeté.${reason ? ` Raison: ${reason}` : ''}`,
        link: `/dashboard/reports/${reportId}`,
        metadata: { reportId, reportTitle, reason }
    }, tx);
}

/**
 * Notify when budget allocation is received
 */
export async function notifyAllocationReceived(
    recipientId: string,
    amount: number,
    fromEntity: string,
    tx?: any
): Promise<Notification> {
    return createNotification({
        userId: recipientId,
        type: 'ALLOCATION_RECEIVED',
        title: '💰 Nouvelle Allocation Budgétaire',
        message: `Vous avez reçu ${new Intl.NumberFormat('fr-FR').format(amount)} FC de ${fromEntity}.`,
        link: '/dashboard/finances',
        metadata: { amount, fromEntity }
    }, tx);
}

/**
 * Notify about upcoming activity
 */
export async function notifyActivityReminder(
    userId: string,
    activityTitle: string,
    activityId: string,
    daysUntil: number
): Promise<Notification> {
    return createNotification({
        userId: userId,
        type: 'ACTIVITY_REMINDER',
        title: '📅 Rappel d\'Activité',
        message: `L'activité "${activityTitle}" aura lieu dans ${daysUntil} jour(s).`,
        link: `/dashboard/activities/${activityId}`,
        metadata: { activityId, activityTitle, daysUntil }
    });
}

/**
 * Notify about a new activity created/assigned
 */
export async function notifyActivityCreated(
    userId: string,
    activityTitle: string,
    activityId: string,
    tx?: any
): Promise<Notification> {
    return createNotification({
        userId: userId,
        type: 'ACTIVITY_REMINDER',
        title: '🆕 Nouvelle Activité',
        message: `L'activité "${activityTitle}" a été créée et vous est assignée ou concerne votre périmètre.`,
        link: `/dashboard/activities/${activityId}`,
        metadata: { activityId, activityTitle }
    }, tx);
}

/**
 * Notify when a new report is submitted (for reviewers)
 */
export async function notifyNewReport(
    reviewerId: string,
    reportTitle: string,
    reportId: string,
    submitterName: string,
    tx?: any
): Promise<Notification> {
    return createNotification({
        userId: reviewerId,
        type: 'NEW_REPORT',
        title: '📝 Nouveau Rapport à Valider',
        message: `${submitterName} a soumis le rapport "${reportTitle}".`,
        link: `/dashboard/reports/${reportId}`,
        metadata: { reportId, reportTitle, submitterName }
    }, tx);
}

/**
 * Notify when a new member is added to a site or group
 */
export async function notifyMemberAdded(
    leaderId: string,
    memberName: string,
    entityName: string, // Site or Group name
    tx?: any
): Promise<Notification> {
    return createNotification({
        userId: leaderId,
        type: 'USER_INVITED',
        title: '👥 Nouveau Membre',
        message: `${memberName} a rejoint ${entityName}.`,
        link: '/dashboard/members',
        metadata: { memberName, entityName }
    }, tx);
}

/**
 * Notify when budget is low (preventive)
 */
export async function notifyBudgetLow(
    userId: string,
    entityName: string,
    remainingAmount: number
): Promise<Notification> {
    return createNotification({
        userId: userId,
        type: 'BUDGET_ALERT',
        title: '⚠️ Alerte Budget Faible',
        message: `Le budget de ${entityName} est faible: ${new Intl.NumberFormat('fr-FR').format(remainingAmount)} FC restants.`,
        link: '/dashboard/finances',
        metadata: { entityName, remainingAmount, severity: 'warning' }
    });
}

/**
 * Notify about a budget overrun (available < 0)
 */
export async function notifyBudgetOverrun(params: {
    siteId?: string;
    smallGroupId?: string;
    entityName: string;
    balance: number;
    tx?: any;
}): Promise<void> {
    const { siteId, smallGroupId, entityName, balance, tx } = params;
    const client = tx || prisma;

    const formattedBalance = new Intl.NumberFormat('fr-FR').format(Math.abs(balance));
    const title = '🚨 Dépassement Budgétaire';
    const message = `Alerte : ${entityName} présente un solde négatif de -${formattedBalance} FC.`;
    const link = '/dashboard/finances';

    if (siteId && !smallGroupId) {
        const ncs = await client.profile.findMany({
            where: { role: 'NATIONAL_COORDINATOR' },
            select: { id: true }
        });

        const scs = await client.profile.findMany({
            where: { role: 'SITE_COORDINATOR', siteId },
            select: { id: true }
        });

        const targets = [...new Set([...ncs.map((n: { id: string }) => n.id), ...scs.map((s: { id: string }) => s.id)])];

        await Promise.all(targets.map((userId: string) =>
            createNotification({
                userId,
                type: 'BUDGET_ALERT',
                title,
                message,
                link,
                metadata: { siteId, balance, severity: 'critical' }
            }, client)
        ));
    } else if (smallGroupId) {
        const group = await client.smallGroup.findUnique({
            where: { id: smallGroupId },
            select: { siteId: true }
        });

        if (group?.siteId) {
            const scs = await client.profile.findMany({
                where: { role: 'SITE_COORDINATOR', siteId: group.siteId },
                select: { id: true }
            });

            await Promise.all(scs.map((sc: { id: string }) =>
                createNotification({
                    userId: sc.id,
                    type: 'BUDGET_ALERT',
                    title,
                    message,
                    link,
                    metadata: { smallGroupId, balance, severity: 'critical' }
                }, client)
            ));
        }
    }
}

const notificationService = {
    createNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteOldNotifications,
    // Helpers
    notifyReportApproved,
    notifyReportRejected,
    notifyAllocationReceived,
    notifyActivityReminder,
    notifyActivityCreated,
    notifyMemberAdded,
    notifyNewReport,
    notifyBudgetLow,
    notifyBudgetOverrun,
};

export default notificationService;
