import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import notificationService from '@/services/notificationService';
import { sendEmail, emailTemplates } from '@/lib/email/emailService';

export async function GET(req: NextRequest) {
    // Validate Cron Secret (MANDATORY - FIX FOR ITERATION 1)
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[CRON_REMINDERS] CRON_SECRET environment variable not configured');
        return new NextResponse('Server Configuration Error', { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const today = new Date();
        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);

        // 1. Upcoming Activities (in 2 days)
        // Range: Start of day to End of day for target date
        const startOfTargetDay = new Date(twoDaysFromNow.setHours(0, 0, 0, 0));
        const endOfTargetDay = new Date(twoDaysFromNow.setHours(23, 59, 59, 999));

        const activities = await prisma.activity.findMany({
            where: {
                date: {
                    gte: startOfTargetDay,
                    lte: endOfTargetDay,
                },
                status: { in: ['planned', 'delayed'] },
            },
            include: {
                createdBy: true, // Activity creator usually coordinates it
                smallGroup: { include: { leader: true } },
                site: { include: { coordinator: true } }
            }
        });

        let remindersSent = 0;

        for (const activity of activities) {
            // Determine who to notify
            const recipients = [];

            // If Small Group activity, notify Leader
            if (activity.smallGroup?.leader?.id) {
                recipients.push(activity.smallGroup.leader);
            }
            // If Site activity, notify Coordinator
            else if (activity.site?.coordinator?.id) {
                recipients.push(activity.site.coordinator);
            }
            // Notify creator as fallback
            else if (activity.createdBy?.id) {
                recipients.push(activity.createdBy);
            }

            for (const recipient of recipients) {
                // In-App Notification
                await notificationService.notifyActivityReminder(
                    recipient.id,
                    activity.title,
                    activity.id,
                    2
                );

                // Email Notification
                if (recipient.email) {
                    await sendEmail({
                        to: recipient.email,
                        subject: `Rappel : ${activity.title} dans 2 jours`,
                        html: emailTemplates.reminder(recipient.name, activity.title, 2)
                    });
                }
                remindersSent++;
            }
        }

        // 2. Overdue Reports
        // Submission deadline passed (activity date < yesterday) and still pending
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const overdueReports = await prisma.activity.findMany({
            where: {
                date: { lt: yesterday },
                status: 'executed', // Only check executed ones, or planned ones that passed?
                // Actually, usually we track reports by the 'Report' model, but reports are created BY users. 
                // If report NOT created, we need to nudge them to create one.
                // OR if Report exists but status is 'pending' (draft).
                // Let's assume we nudge for Activities that are 'executed' or 'planned' in past but have NO submitted report.
                reports: {
                    none: { status: { in: ['submitted', 'approved'] } }
                }
            },
            include: {
                createdBy: true,
                smallGroup: { include: { leader: true } }
            }
        });

        let overdueAlerts = 0;
        // Simplified: Just notify for pending reports already created but not submitted?
        // User requested "Overdue Reports". Let's scan Report table for 'pending' old reports.

        // Strategy B: Scan pending reports older than 3 days
        // This assumes they started drafting.
        const pendingReports = await prisma.report.findMany({
            where: {
                status: 'pending',
                updatedAt: { lt: yesterday } // Not touched in 24h
            },
            include: { submittedBy: true }
        });

        for (const report of pendingReports) {
            // In-App Nudge
            await notificationService.createNotification({
                userId: report.submittedById,
                type: 'ACTIVITY_REMINDER', // Reuse type or add NEW type
                title: 'Rapport en attente',
                message: `N'oubliez pas de soumettre votre rapport "${report.title}".`,
                link: `/dashboard/reports/${report.id}`
            });

            // Email
            if (report.submittedBy?.email) {
                await sendEmail({
                    to: report.submittedBy.email,
                    subject: `Rappel : Rapport non soumis`,
                    html: emailTemplates.overdueReport(report.submittedBy.name, report.title)
                });
            }
            overdueAlerts++;
        }

        return NextResponse.json({
            success: true,
            remindersSent,
            overdueAlerts
        });

    } catch (error) {
        // ✅ SECURITY: Don't log error object (may contain emails in bulk reminders)
        console.error('[CRON_DAILY_REMINDERS_ERROR]', {
            type: error?.constructor?.name
        });
        return new NextResponse('Internal Error', { status: 500 });
    }
}
