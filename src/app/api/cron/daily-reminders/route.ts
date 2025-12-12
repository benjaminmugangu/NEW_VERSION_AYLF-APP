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
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        // 1. Upcoming Activities (in 2 days)
        const remindersSent = await processUpcomingActivities(today);

        // 2. Overdue Reports (Pending & Untouched for 24h)
        const overdueAlerts = await processOverdueReports(yesterday);

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

async function processUpcomingActivities(today: Date): Promise<number> {
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

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
            createdBy: true,
            smallGroup: { include: { leader: true } },
            site: { include: { coordinator: true } }
        }
    });

    let remindersSent = 0;

    for (const activity of activities) {
        const recipients = getRecipientsForActivity(activity);

        for (const recipient of recipients) {
            await sendActivityReminder(recipient, activity);
            remindersSent++;
        }
    }
    return remindersSent;
}

function getRecipientsForActivity(activity: any) {
    const recipients = [];
    if (activity.smallGroup?.leader?.id) {
        recipients.push(activity.smallGroup.leader);
    } else if (activity.site?.coordinator?.id) {
        recipients.push(activity.site.coordinator);
    } else if (activity.createdBy?.id) {
        recipients.push(activity.createdBy);
    }
    return recipients;
}

async function sendActivityReminder(recipient: any, activity: any) {
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
}

async function processOverdueReports(yesterday: Date): Promise<number> {
    const pendingReports = await prisma.report.findMany({
        where: {
            status: 'pending',
            updatedAt: { lt: yesterday } // Not touched in 24h
        },
        include: { submittedBy: true }
    });

    let overdueAlerts = 0;
    for (const report of pendingReports) {
        await sendOverdueReportAlert(report);
        overdueAlerts++;
    }
    return overdueAlerts;
}

async function sendOverdueReportAlert(report: any) {
    // In-App Nudge
    await notificationService.createNotification({
        userId: report.submittedById,
        type: 'ACTIVITY_REMINDER',
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
}
