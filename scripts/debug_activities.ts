
import { basePrisma } from '../src/lib/prisma';

async function debugReportableActivities() {
    // 1. Find the user
    const user = await basePrisma.profile.findFirst({
        where: {
            OR: [
                { name: { contains: 'Infor' } },
                { role: 'SITE_COORDINATOR' }
            ]
        },
        include: { site: true }
    });

    if (!user) {
        console.log("No Site Coordinator found to debug.");
        return;
    }

    console.log(`\n=== DEBUGGING FOR USER: ${user.name} (${user.id}) ===`);
    console.log(`Role: ${user.role}, Site: ${user.site?.name} (${user.siteId})`);

    // 2. Find ALL activities in that site
    const siteActivities = await basePrisma.activity.findMany({
        where: { siteId: user.siteId },
        include: { reports: true }
    });

    console.log(`\nFound ${siteActivities.length} activities in site ${user.site?.name}`);

    const now = new Date();
    const delayMs = 5 * 60 * 60 * 1000;
    const cutoffDate = new Date(now.getTime() - delayMs);
    console.log(`Current Time: ${now.toISOString()}`);
    console.log(`Cutoff (+5h): ${cutoffDate.toISOString()}`);

    siteActivities.forEach((a: any) => {
        const isCreatedByMe = a.createdById === user.id;
        const isEligibleDate = new Date(a.date) <= cutoffDate;
        const hasNoReport = a.reports.length === 0;
        const isEligibleStatus = ['planned', 'in_progress', 'delayed'].includes(a.status);

        console.log(`\n- Activity: "${a.title}"`);
        console.log(`  ID: ${a.id}`);
        console.log(`  Date: ${new Date(a.date).toISOString()}`);
        console.log(`  Status: ${a.status}`);
        console.log(`  CreatedBy: ${a.createdById} (Match: ${isCreatedByMe})`);
        console.log(`  Has Report: ${!hasNoReport}`);
        console.log(`  Checks:`);
        console.log(`    [${isCreatedByMe ? 'X' : ' '}] Created By Me`);
        console.log(`    [${isEligibleDate ? 'X' : ' '}] Past +5h Mark`);
        console.log(`    [${isEligibleStatus ? 'X' : ' '}] Eligible Status`);
        console.log(`    [${hasNoReport ? 'X' : ' '}] No Previous Report`);

        if (isCreatedByMe && isEligibleDate && isEligibleStatus && hasNoReport) {
            console.log(`  >>> SHOULD BE IN DROPDOWN! <<<`);
        }
    });

    // 3. Test the exact filter from activityService.ts
    const reportable = await basePrisma.activity.findMany({
        where: {
            createdById: user.id,
            date: { lte: cutoffDate },
            status: { in: ['planned', 'in_progress', 'delayed'] },
            reports: { none: {} }
        }
    });

    console.log(`\nFinal Verdict: ${reportable.length} activities returned by strict filter.`);
}

debugReportableActivities()
    .catch(err => {
        console.error("DEBUG SCRIPT FAILED:", err);
        process.exit(1);
    })
    .finally(() => process.exit(0));
