import { prisma } from '@/lib/prisma';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationData {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: Date;
}

/**
 * Create a new notification for a user
 */
export async function createNotification(data: CreateNotificationData): Promise<Notification> {
    return await prisma.notification.create({
        data: {
            userId: data.userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link || null,
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

    return await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
    });
}

/**
 * Get count of unread notifications for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return await prisma.notification.count({
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
    return await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
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
    await prisma.notification.delete({
        where: { id: notificationId },
    });
}

/**
 * Delete old read notifications (cleanup utility)
 */
export async function deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
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
    reportId: string
): Promise<Notification> {
    return createNotification({
        userId: submitterId,
        type: 'REPORT_APPROVED',
        title: '✅ Rapport Approuvé!',
        message: `Votre rapport "${reportTitle}" a été approuvé.`,
        link: `/dashboard/reports/${reportId}`,
    });
}

/**
 * Notify when a report is rejected
 */
export async function notifyReportRejected(
    submitterId: string,
    reportTitle: string,
    reportId: string,
    reason?: string
): Promise<Notification> {
    return createNotification({
        userId: submitterId,
        type: 'REPORT_REJECTED',
        title: '❌ Rapport Rejeté',
        message: `Votre rapport "${reportTitle}" a été rejeté.${reason ? ` Raison: ${reason}` : ''}`,
        link: `/dashboard/reports/${reportId}`,
    });
}

/**
 * Notify when budget allocation is received
 */
export async function notifyAllocationReceived(
    recipientId: string,
    amount: number,
    fromEntity: string
): Promise<Notification> {
    return createNotification({
        userId: recipientId,
        type: 'ALLOCATION_RECEIVED',
        title: '💰 Nouvelle Allocation Budgétaire',
        message: `Vous avez reçu ${new Intl.NumberFormat('fr-FR').format(amount)} FC de ${fromEntity}.`,
        link: '/dashboard/finances',
    });
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
    });
}

/**
 * Notify when a new report is submitted (for reviewers)
 */
export async function notifyNewReport(
    reviewerId: string,
    reportTitle: string,
    reportId: string,
    submitterName: string
): Promise<Notification> {
    return createNotification({
        userId: reviewerId,
        type: 'NEW_REPORT',
        title: '📝 Nouveau Rapport à Valider',
        message: `${submitterName} a soumis le rapport "${reportTitle}".`,
        link: `/dashboard/reports/${reportId}`,
    });
}

/**
 * Notify when budget is low
 */
export async function notifyBudgetAlert(
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
    });
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
    notifyNewReport,
    notifyBudgetAlert,
};

export default notificationService;
