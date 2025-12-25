
import { NextResponse } from 'next/server';
import { prisma, withRLS } from "@/lib/prisma";
import * as activityService from '@/services/activityService';
import * as reportService from '@/services/reportService';
import * as dashboardService from '@/services/dashboardService';

// This API simulates the "Life Cycle" of data as described in the User Guide
// It leverages the actual Service layer, ensuring that business logic and RLS are tested.

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const userEmail = 'mugangubenjamin696@gmail.com';

        // 1. Authenticate & Get Context (Simulated)
        const user = await prisma.profile.findUnique({
            where: { email: userEmail },
        });

        if (!user) return NextResponse.json({ error: "User not found" });

        // Helper to run in RLS context
        const executeInContext = async (fn: () => Promise<any>) => {
            return await withRLS(user.id, fn);
        };

        let result;

        switch (action) {
            // ==========================================
            // SGL SCENARIO: Plan Activity & Submit Report
            // ==========================================
            case 'sgl_plan_activity':
                result = await executeInContext(async () => {
                    // if (user.role !== 'SMALL_GROUP_LEADER') throw new Error("Role must be SGL");

                    // Create defaults if not exists to prevent FK errors
                    let activityType = await prisma.activityType.findFirst();
                    if (!activityType) {
                        activityType = await prisma.activityType.create({
                            data: { name: 'Bible Study', category: 'spiritual' }
                        });
                    }

                    return await activityService.createActivity({
                        title: "Bible Study - Verification",
                        thematic: "Faith and Code",
                        date: new Date(),
                        status: 'planned',
                        level: 'small_group',
                        activityTypeId: activityType.id,
                        siteId: user.siteId!,
                        smallGroupId: user.smallGroupId!,
                        createdBy: user.id
                    }, user); // Pass user context
                });
                break;

            case 'sgl_submit_report':
                result = await executeInContext(async () => {
                    // Find the activity we just created
                    const activity = await prisma.activity.findFirst({
                        where: { title: "Bible Study - Verification", smallGroupId: user.smallGroupId },
                        orderBy: { createdAt: 'desc' }
                    });

                    if (!activity) throw new Error("Activity not found");

                    return await reportService.createReport({
                        title: `Report: ${activity.title}`,
                        activityId: activity.id,
                        content: "We had a great time testing the system.",
                        thematic: activity.thematic,
                        activityDate: new Date().toISOString(),
                        girlsCount: 5,
                        boysCount: 5,
                        expenses: 0,
                        financialSummary: "None",
                        submittedBy: user.id,
                        siteId: user.siteId!,
                        smallGroupId: user.smallGroupId!,
                        activityTypeId: activity.activityTypeId,
                        activityTypeId: activity.activityTypeId,
                        level: 'small_group',
                        status: 'submitted',
                        images: []
                    }, user); // Pass user context
                });
                break;

            // ==========================================
            // SC SCENARIO: Validate Report
            // ==========================================
            case 'sc_approve_report':
                result = await executeInContext(async () => {
                    if (user.role !== 'SITE_COORDINATOR') throw new Error(`Role must be SC, got: ${user.role}`);

                    // Find pending report in MY site
                    // RLS should filter this naturally!
                    const report = await prisma.report.findFirst({
                        where: { title: { contains: "Verification" }, status: 'submitted' }
                    });

                    if (!report) throw new Error("No pending report found (or RLS blocked it)");

                    // Approve it
                    return await reportService.approveReport(report.id, user.id);
                });
                break;

            // ==========================================
            // MEMBER SCENARIO: View Agenda
            // ==========================================
            case 'member_view_agenda':
                result = await executeInContext(async () => {
                    // Ensure role is member (or just trust the simulation logic)
                    if (user.role !== 'MEMBER') throw new Error("Role must be MEMBER");

                    // Fetch agenda
                    const activities = await activityService.getFilteredActivities({
                        user: user, // pass full user object for RBAC
                        dateFilter: undefined,
                        searchTerm: '',
                        statusFilter: { planned: true },
                        levelFilter: { small_group: true }
                    });

                    return activities.map(a => ({ title: a.title, date: a.date }));
                });
                break;

            // ==========================================
            // NC SCENARIO: Global Stats
            // ==========================================
            // ==========================================
            // FINANCIALS: Record Transaction (NC)
            // ==========================================
            case 'nc_record_transaction':
                result = await executeInContext(async () => {
                    if (user.role !== 'NATIONAL_COORDINATOR') throw new Error("Role must be NC");

                    // Create Income
                    const income = await prisma.financialTransaction.create({
                        data: {
                            type: 'income',
                            amount: 1000,
                            date: new Date(),
                            category: 'Donation',
                            description: 'Verification Donation',
                            recordedById: user.id,
                            status: 'approved', // Auto-approve for NC
                        }
                    });

                    // Create Expense
                    const expense = await prisma.financialTransaction.create({
                        data: {
                            type: 'expense',
                            amount: 200,
                            date: new Date(),
                            category: 'Supplies',
                            description: 'Office Supplies',
                            recordedById: user.id,
                            status: 'approved',
                        }
                    });

                    return { income, expense };
                });
                break;

            // ==========================================
            // EXPORTS: Generate CSV
            // ==========================================
            case 'nc_export_transactions':
                result = await executeInContext(async () => {
                    if (user.role !== 'NATIONAL_COORDINATOR') throw new Error("Role must be NC");

                    // We import dynamically to avoid top-level issues if modules differ
                    const exportService = await import('@/services/exportService');
                    const csv = await exportService.exportTransactionsToCSV({
                        from: new Date(new Date().getFullYear(), 0, 1).toISOString(), // Start of year
                        to: new Date().toISOString()
                    });

                    if (!csv || csv.length < 10) throw new Error("CSV generation failed or empty");
                    return { csvLength: csv.length, preview: csv.substring(0, 100) };
                });
                break;

            // ==========================================
            // CERTIFICATES: Simulate Download
            // ==========================================
            case 'member_get_certificate':
                result = await executeInContext(async () => {
                    // Verify user exists and has a join date
                    if (!user.createdAt) throw new Error("User has no creation date");

                    // Simulate certificate logic (usually checking if mandate ended)
                    // For testing, just verify we can fetch the user's data for it
                    const certData = {
                        name: user.name,
                        role: user.role,
                        id: user.id,
                        generatedAt: new Date()
                    };
                    return { certificateGenerated: true, data: certData };
                });
                break;

            // ==========================================
            // PUBLIC: Impact Page Stats
            // ==========================================
            case 'public_impact_view':
                // NO AUTH REQUIRED - Run outside executeInContext (or ignore user)
                const memberCount = await prisma.member.count();
                const activityCount = await prisma.activity.count({ where: { status: 'executed' } });
                const siteCount = await prisma.site.count();
                const groupCount = await prisma.smallGroup.count();

                result = { memberCount, activityCount, siteCount, groupCount, access: 'public' };
                break;

            case 'nc_check_stats':
                result = await executeInContext(async () => {
                    if (user.role !== 'NATIONAL_COORDINATOR') throw new Error("Role must be NC");

                    return await dashboardService.default.getDashboardStats(user as any, 'year');
                });
                break;

            // ==========================================
            // SYSTEM AUDIT: Verify Logs & Notifications
            // ==========================================
            case 'system_audit':
                result = await executeInContext(async () => {
                    // 1. Fetch Audit Logs (Should have SGL submit, NC transaction, etc.)
                    const logs = await prisma.auditLog.findMany({
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        include: { actor: { select: { name: true, role: true } } }
                    });

                    // 2. Fetch Notifications for the current user
                    const notifications = await prisma.notification.findMany({
                        where: { userId: user.id },
                        take: 5,
                        orderBy: { createdAt: 'desc' }
                    });

                    return {
                        logCount: logs.length,
                        latestLog: logs[0],
                        notificationCount: notifications.length,
                        latestNotification: notifications[0]
                    };
                });
                break;

            default:
                return NextResponse.json({ error: "Invalid life-cycle action" }, { status: 400 });
        }

        return NextResponse.json({ success: true, action, result });

    } catch (error: any) {
        console.error("Simulation API Error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
