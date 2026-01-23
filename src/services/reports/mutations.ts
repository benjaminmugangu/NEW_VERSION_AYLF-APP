'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { ServiceResponse, ReportWithDetails, ReportFormData, ErrorCode } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { notifyNewReport } from '../notificationService';
import { deleteFile, extractFilePath } from '../storageService';
import { checkPeriod } from '../accountingService';
import { mapPrismaReportToModel, mapUpdateDataFields } from './shared';

export async function createReport(reportData: ReportFormData, overrideUser?: any): Promise<ServiceResponse<ReportWithDetails>> {
    console.log(`[createReport] Received data:`, JSON.stringify(reportData, null, 2));
    const { getUser } = getKindeServerSession();
    const user = overrideUser || await getUser();

    if (!user?.id) {
        console.error(`[createReport] Unauthorized: No user ID found.`);
        return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };
    }

    const { basePrisma } = await import('@/lib/prisma');

    // 1. Fetch full profile for RBAC
    const { getProfile } = await import('../profileService');
    const profileResponse = await getProfile(user.id);
    if (!profileResponse.success || !profileResponse.data) {
        console.error(`[createReport] Profile not found for user ${user.id}`);
        return { success: false, error: { message: 'Profile not found', code: ErrorCode.NOT_FOUND } };
    }
    const dbProfile = profileResponse.data;
    console.log(`[createReport] Profile fetched: ${dbProfile.name} (${dbProfile.role})`);

    // 2. Idempotency Check (Pre-Transaction)
    if (reportData.idempotencyKey) {
        const existing = await basePrisma.idempotencyKey.findUnique({
            where: { key: reportData.idempotencyKey }
        });
        if (existing) {
            console.log(`[createReport] Idempotency hit: ${reportData.idempotencyKey}`);
            return existing.response as any;
        }
    }

    return await withRLS(user.id, async () => {
        // 3. Mutual Exclusivity & Level Validation
        console.log(`[createReport] Validating level: ${reportData.level}, Site ID: ${reportData.siteId}, Group ID: ${reportData.smallGroupId}`);
        if (reportData.level === 'national') {
            reportData.siteId = undefined;
            reportData.smallGroupId = undefined;
        } else if (reportData.level === 'site') {
            if (!reportData.siteId) {
                console.error(`[createReport] Missing Site ID for site-level report.`);
                return { success: false, error: { message: 'Site ID is required for site-level reports.', code: ErrorCode.VALIDATION_ERROR } };
            }
            reportData.smallGroupId = undefined;
        } else if (reportData.level === 'small_group' && !reportData.smallGroupId) {
            console.error(`[createReport] Missing Group ID for small-group-level report.`);
            return { success: false, error: { message: 'Small Group ID is required for small-group-level reports.', code: ErrorCode.VALIDATION_ERROR } };
        }

        try {
            const result = await basePrisma.$transaction(async (tx: any) => {
                // A. Manually set RLS context
                await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

                // B. CRITICAL: Prevent multiple reports per activity
                // B1. Fetch Activity Source (Trusted Source)
                let activitySource = null;
                if (reportData.activityId) {
                    console.log(`[createReport] Fetching activity source: ${reportData.activityId}`);
                    activitySource = await tx.activity.findUnique({
                        where: { id: reportData.activityId },
                        select: { id: true, date: true, createdById: true, title: true, status: true, level: true, siteId: true, smallGroupId: true }
                    });

                    if (!activitySource) throw new Error("NOT_FOUND: Activity source not found");
                    console.log(`[createReport] Activity source found: "${activitySource.title}" (Level: ${activitySource.level})`);

                    // B2. GUARD: Role-Based Scope Validation (NC: all, SC: site activities, SGL: group activities)
                    const { role, siteId, smallGroupId } = dbProfile;

                    if (role === ROLES.SITE_COORDINATOR) {
                        if (activitySource.level !== 'site' || activitySource.siteId !== siteId) {
                            console.error(`[createReport] FORBIDDEN: SC scope mismatch. User Site: ${siteId}, Activity Site: ${activitySource.siteId}`);
                            throw new Error("FORBIDDEN: Site Coordinators can only report site-level activities in their site.");
                        }
                    } else if (role === ROLES.SMALL_GROUP_LEADER) {
                        if (activitySource.level !== 'small_group' || activitySource.smallGroupId !== smallGroupId) {
                            console.error(`[createReport] FORBIDDEN: SGL scope mismatch. User Group: ${smallGroupId}, Activity Group: ${activitySource.smallGroupId}`);
                            throw new Error("FORBIDDEN: Small Group Leaders can only report activities for their specific group.");
                        }
                    } else if (role === ROLES.NATIONAL_COORDINATOR) {
                        // NC can report anything (national priority)
                    } else {
                        // Fallback: Creator Only
                        if (activitySource.createdById !== user.id) {
                            console.error(`[createReport] FORBIDDEN: User ${user.id} is not the creator ${activitySource.createdById}`);
                            throw new Error("FORBIDDEN: Security Violation. Unauthorized to report this activity.");
                        }
                    }

                    // B3. GUARD: 5-Hour Delay Rule (Anti-Anticipation)
                    const REPORT_DELAY_MS = 5 * 60 * 60 * 1000;
                    const now = new Date();
                    const activityTime = new Date(activitySource.date).getTime();

                    if (now.getTime() - activityTime < REPORT_DELAY_MS) {
                        const eligibleTime = new Date(activityTime + REPORT_DELAY_MS);
                        const { format } = await import('date-fns');
                        console.error(`[createReport] VALIDATION_ERROR: Activity started at ${new Date(activitySource.date).toISOString()}. Too early to report.`);
                        throw new Error(`VALIDATION_ERROR: Integrity Rule. Reports can only be submitted 5 hours after activity start. Eligible at: ${format(eligibleTime, 'HH:mm')}`);
                    }

                    // B4. GUARD: Accounting Period Lock
                    await checkPeriod(activitySource.date, 'Création de rapport');
                }

                // B. GUARD: Prevent multiple reports per activity
                if (reportData.activityId) {
                    const existingReport = await tx.report.findFirst({
                        where: { activityId: reportData.activityId },
                        select: { id: true, title: true, status: true }
                    });

                    if (existingReport) {
                        console.error(`[createReport] CONFLICT: Activity ${reportData.activityId} already reported by report ${existingReport.id}`);
                        throw new Error(
                            `ACTIVITY_ALREADY_REPORTED: Un rapport existe déjà pour cette activité. ` +
                            `Rapport existant: "${existingReport.title}" (statut: ${existingReport.status}).`
                        );
                    }
                }

                // C. Create Report
                console.log(`[createReport] Creating report in database...`);
                const report = await tx.report.create({
                    data: {
                        title: reportData.title,
                        activityDate: reportData.activityDate,
                        level: reportData.level,
                        status: reportData.status,
                        content: reportData.content,
                        thematic: reportData.thematic,
                        speaker: reportData.speaker,
                        moderator: reportData.moderator,
                        girlsCount: reportData.girlsCount,
                        boysCount: reportData.boysCount,
                        participantsCountReported: reportData.participantsCountReported,
                        totalExpenses: reportData.totalExpenses,
                        currency: reportData.currency,
                        financialSummary: reportData.financialSummary,
                        images: reportData.images as any,
                        attachments: reportData.attachments as any,
                        submittedById: user.id,
                        siteId: reportData.siteId,
                        smallGroupId: reportData.smallGroupId,
                        activityTypeId: reportData.activityTypeId,
                        activityId: reportData.activityId,
                    },
                });

                // D. Link back to Activity (Update Status) - Atomic
                if (reportData.activityId) {
                    console.log(`[createReport] Updating activity status to 'executed'`);
                    await tx.activity.update({
                        where: { id: reportData.activityId },
                        data: { status: 'executed' }
                    });
                }

                const finalReport = await mapPrismaReportToModel(report);

                // E. Record Idempotency
                if (reportData.idempotencyKey) {
                    await tx.idempotencyKey.create({
                        data: {
                            key: reportData.idempotencyKey,
                            response: { success: true, data: finalReport } as any,
                            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                        }
                    });
                }

                // F. Notifications (Inside Transaction)
                try {
                    console.log(`[createReport] Sending notifications to NCs...`);
                    const reviewers = await tx.profile.findMany({
                        where: { role: ROLES.NATIONAL_COORDINATOR }
                    });
                    for (const reviewer of reviewers) {
                        await notifyNewReport(reviewer.id, finalReport.title, finalReport.id, dbProfile.name, tx);
                    }
                } catch (notifyError) {
                    console.error('[Mutation] Notification failed:', notifyError);
                }

                return finalReport;
            });

            console.log(`[createReport] Success: Report created with ID ${result.id}`);
            return { success: true, data: result };
        } catch (error: any) {
            console.error(`[createReport] Transaction Error: ${error.message}`);
            let code = ErrorCode.INTERNAL_ERROR;
            if (error.message.includes('FORBIDDEN')) code = ErrorCode.FORBIDDEN;
            if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
            if (error.message.includes('VALIDATION_ERROR')) code = ErrorCode.VALIDATION_ERROR;
            if (error.message.includes('ACTIVITY_ALREADY_REPORTED')) code = ErrorCode.CONFLICT;
            if (error.message.includes('PERIOD_CLOSED')) code = ErrorCode.PERIOD_CLOSED;

            return { success: false, error: { message: error.message, code } };
        }
    });
}

export async function updateReport(reportId: string, updates: Partial<ReportFormData>): Promise<ServiceResponse<ReportWithDetails>> {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user?.id) {
        return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };
    }

    return await withRLS(user.id, async () => {
        try {
            const { basePrisma } = await import('@/lib/prisma');
            const result = await basePrisma.$transaction(async (tx: any) => {
                await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

                const existing = await tx.report.findUnique({
                    where: { id: reportId },
                    select: { submittedById: true, status: true, activityDate: true }
                });

                if (!existing) throw new Error('NOT_FOUND: Report not found.');

                // RBAC Guard
                const { role } = await tx.profile.findUnique({ where: { id: user.id }, select: { role: true } });
                if (existing.submittedById !== user.id && role !== ROLES.NATIONAL_COORDINATOR) {
                    throw new Error('FORBIDDEN: You can only edit your own reports.');
                }

                // Status Guard
                if (existing.status !== 'pending' && existing.status !== 'rejected' && role !== ROLES.NATIONAL_COORDINATOR) {
                    throw new Error('FORBIDDEN: Once submitted, reports can only be edited by a National Coordinator or if rejected.');
                }

                // Accounting Period Guard
                if (updates.activityDate) {
                    await checkPeriod(new Date(updates.activityDate), 'Modification de rapport');
                } else {
                    await checkPeriod(existing.activityDate, 'Modification de rapport');
                }

                const dbUpdates = mapUpdateDataFields(updates);

                const updated = await tx.report.update({
                    where: { id: reportId },
                    data: dbUpdates
                });

                return await mapPrismaReportToModel(updated);
            });

            return { success: true, data: result };
        } catch (error: any) {
            console.error(`[Mutation] updateReport Error: ${error.message}`);
            let code = ErrorCode.INTERNAL_ERROR;
            if (error.message.includes('FORBIDDEN')) code = ErrorCode.FORBIDDEN;
            if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
            return { success: false, error: { message: error.message, code } };
        }
    });
}

export async function deleteReport(reportId: string): Promise<ServiceResponse<void>> {
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user?.id) {
        return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };
    }

    return await withRLS(user.id, async () => {
        try {
            const { basePrisma } = await import('@/lib/prisma');
            await basePrisma.$transaction(async (tx: any) => {
                await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

                const existing = await tx.report.findUnique({
                    where: { id: reportId },
                    select: { submittedById: true, images: true, activityDate: true }
                });

                if (!existing) throw new Error('NOT_FOUND: Report not found.');

                // RBAC Guard
                const { role } = await tx.profile.findUnique({ where: { id: user.id }, select: { role: true } });
                if (existing.submittedById !== user.id && role !== ROLES.NATIONAL_COORDINATOR) {
                    throw new Error('FORBIDDEN: You can only delete your own reports.');
                }

                // Accounting Period Guard
                await checkPeriod(existing.activityDate, 'Suppression de rapport');

                // Cleanup files
                if (existing.images) {
                    const images = existing.images as string[];
                    for (const img of images) {
                        const path = extractFilePath(img);
                        if (path) await deleteFile(path, { bucketName: 'reports', isRollback: true });
                    }
                }

                await tx.report.delete({ where: { id: reportId } });
            });

            return { success: true };
        } catch (error: any) {
            console.error(`[Mutation] deleteReport Error: ${error.message}`);
            let code = ErrorCode.INTERNAL_ERROR;
            if (error.message.includes('FORBIDDEN')) code = ErrorCode.FORBIDDEN;
            if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
            return { success: false, error: { message: error.message, code } };
        }
    });
}
