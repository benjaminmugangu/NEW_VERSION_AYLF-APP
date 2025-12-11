import { NextRequest, NextResponse } from 'next/server';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import notificationService from '@/services/notificationService';
import { MESSAGES } from '@/lib/messages';
import * as z from 'zod';

// ✅ Zod schemas for validation (ADDED - FIX FOR ITERATION 4)
const notificationPatchSchema = z.object({
    notificationId: z.string().uuid().optional(),
    markAllRead: z.boolean().optional()
}).refine(data => data.notificationId ?? data.markAllRead, {
    message: "Either notificationId or markAllRead must be provided"
});

const notificationDeleteSchema = z.object({
    notificationId: z.string().uuid()
});

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
 * Query params:
 *   - unread: 'true' to get only unread notifications
 *   - limit: number of notifications to fetch (default 50)
 */
export async function GET(request: NextRequest) {
    try {
        const { getUser, isAuthenticated } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json(
                { error: MESSAGES.errors.unauthorized },
                { status: 401 }
            );
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json(
                { error: MESSAGES.errors.unauthorized },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unread') === 'true';
        const limit = Number.parseInt(searchParams.get('limit') || '100', 10);

        const notifications = await notificationService.getUserNotifications(user.id, {
            unreadOnly,
            limit,
        });

        const unreadCount = await notificationService.getUnreadCount(user.id);

        return NextResponse.json({
            notifications,
            unreadCount,
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/notifications/[id]
 * Mark a notification as read
 */
export async function PATCH(request: NextRequest) {
    try {
        const { getUser, isAuthenticated } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json(
                { error: MESSAGES.errors.unauthorized },
                { status: 401 }
            );
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json(
                { error: MESSAGES.errors.unauthorized },
                { status: 401 }
            );
        }

        const body = await request.json();

        // ✅ Zod validation (ADDED - FIX FOR ITERATION 4)
        const validation = notificationPatchSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: MESSAGES.errors.validation, details: validation.error.format() },
                { status: 400 }
            );
        }

        const { notificationId, markAllRead } = validation.data;

        if (markAllRead) {
            // Mark all notifications as read
            const count = await notificationService.markAllAsRead(user.id);
            return NextResponse.json({
                success: true,
                message: `${count} notification(s) marquée(s) comme lue(s)`,
                count,
            });
        }

        // notificationId is now guaranteed to exist by schema refinement
        if (!notificationId) {
            return NextResponse.json(
                { error: 'notificationId est requis' },
                { status: 400 }
            );
        }

        const notification = await notificationService.markAsRead(notificationId);

        return NextResponse.json({
            success: true,
            notification,
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function DELETE(request: NextRequest) {
    try {
        const { getUser, isAuthenticated } = getKindeServerSession();
        const isAuth = await isAuthenticated();

        if (!isAuth) {
            return NextResponse.json(
                { error: MESSAGES.errors.unauthorized },
                { status: 401 }
            );
        }

        const user = await getUser();
        if (!user) {
            return NextResponse.json(
                { error: MESSAGES.errors.unauthorized },
                { status: 401 }
            );
        }

        const body = await request.json();

        // ✅ Zod validation (ADDED - FIX FOR ITERATION 4)
        const validation = notificationDeleteSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: MESSAGES.errors.validation, details: validation.error.format() },
                { status: 400 }
            );
        }

        const { notificationId } = validation.data;

        await notificationService.deleteNotification(notificationId);

        return NextResponse.json({
            success: true,
            message: 'Notification supprimée',
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return NextResponse.json(
            { error: MESSAGES.errors.serverError },
            { status: 500 }
        );
    }
}
