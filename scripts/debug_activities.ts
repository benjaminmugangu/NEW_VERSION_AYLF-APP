
import { basePrisma, prisma, withRLS } from '../src/lib/prisma';
import { ROLES } from '../src/lib/constants';

async function diagnoseReportVisibility() {
    // 1. Find the target user (Infor Mystique or any SC)
    const profile = await basePrisma.profile.findFirst({
        where: {
            OR: [
                { name: { contains: 'Infor' } },
                { role: ROLES.SITE_COORDINATOR }
            ]
        },
        include: { site: true }
    });

    if (!profile) {
        console.log("❌ No profile found to diagnose.");
        return;
    }

    console.log(`\n=== 🔍 DIAGNOSIS FOR: ${profile.name} ===`);
    console.log(`ID: ${profile.id}`);
    console.log(`Role: ${profile.role}`);
    console.log(`Site: ${profile.site?.name} (${profile.siteId})`);
    console.log(`Group: ${profile.smallGroupId}`);

    // LOGIC PARAMS
    const now = new Date();
    const delayMs = 5 * 60 * 60 * 1000;
    const cutoffDate = new Date(now.getTime() - delayMs);

    console.log(`\n--- 🕒 TIME CONTEXT ---`);
    console.log(`Server Time  : ${now.toISOString()}`);
    console.log(`Cutoff (+5h) : ${cutoffDate.toISOString()}`);

    // STEP A: Check what's in the DB physically (No RLS)
    console.log(`\n--- 🗄️ DATABASE STATE (PHYSICAL - NO RLS) ---`);
    const physicalActivities = await basePrisma.activity.findMany({
        where: { siteId: profile.siteId },
        include: { reports: true }
    });

    console.log(`Found ${physicalActivities.length} activities physically in site ${profile.site?.name}`);

    physicalActivities.forEach((a: any) => {
        const checks = {
            isSiteLevel: a.level === 'site',
            isSmallGroup: a.level === 'small_group',
            isNational: a.level === 'national',
            isPastCutoff: new Date(a.date) <= cutoffDate,
            hasNoReport: !a.reports || a.reports.length === 0,
            isReportableStatus: ['planned', 'in_progress', 'delayed'].includes(a.status),
            isOwned: a.createdById === profile.id
        };

        const canReportAsSC = checks.isSiteLevel && checks.isPastCutoff && checks.hasNoReport && checks.isReportableStatus;
        const canReportAsSGL = checks.isSmallGroup && a.smallGroupId === profile.smallGroupId && checks.isPastCutoff && checks.hasNoReport && checks.isReportableStatus;

        console.log(`\nActivity: "${a.title}" (ID: ${a.id.substring(0, 8)})`);
        console.log(`  Level: ${a.level}, Status: ${a.status}`);
        console.log(`  Date: ${new Date(a.date).toISOString()}`);
        console.log(`  CreatedBy: ${a.createdById === profile.id ? 'ME' : a.createdById}`);
        console.log(`  Checks: SiteLevel:${checks.isSiteLevel}, PastCutoff:${checks.isPastCutoff}, NoReport:${checks.hasNoReport}, StatusOK:${checks.isReportableStatus}`);

        if (profile.role === ROLES.SITE_COORDINATOR && canReportAsSC) {
            console.log(`  ✅ SHOULD be reportable by this SC (Site Level Policy)`);
        } else if (profile.role === ROLES.SMALL_GROUP_LEADER && canReportAsSGL) {
            console.log(`  ✅ SHOULD be reportable by this SGL (Small Group Policy)`);
        } else {
            console.log(`  ❌ NOT reportable (Reason: ${!checks.isSiteLevel ? 'Wrong Level' : !checks.isPastCutoff ? 'Too Recent' : !checks.hasNoReport ? 'Already Reported' : 'Invalid Status'})`);
        }
    });

    // STEP B: Check what's visible through RLS
    console.log(`\n--- 🛡️ RLS VISIBILITY TEST ---`);
    try {
        const visibleActivities = await withRLS(profile.id, async () => {
            return await prisma.activity.findMany({
                where: { siteId: profile.siteId }
            });
        });
        console.log(`RLS Filter: User sees ${visibleActivities.length} activities in their site.`);
    } catch (e: any) {
        console.log(`❌ RLS Visibility Test Failed: ${e.message}`);
    }

    // STEP C: Simulate exactly what the service does
    console.log(`\n--- 🚀 SERVICE LOGIC SIMULATION ---`);
    const { buildActivityWhereClause } = await import('../src/services/activityUtils');
    const where = buildActivityWhereClause({
        user: profile,
        isReportingContext: true,
        statusFilter: { planned: true, in_progress: true, delayed: true }
    });

    console.log(`Generated WHERE: ${JSON.stringify(where, null, 2)}`);

    try {
        const finalResults = await withRLS(profile.id, async () => {
            return await prisma.activity.findMany({
                where: {
                    ...where,
                    reports: { none: {} }
                }
            });
        });
        console.log(`\nFinal Verdict: ${finalResults.length} activities would be sent to the dropdown.`);
        finalResults.forEach((a: any) => console.log(`  - ${a.title}`));
    } catch (e: any) {
        console.log(`❌ Final Query Simulation Failed: ${e.message}`);
    }
}

diagnoseReportVisibility()
    .catch(console.error)
    .finally(() => process.exit(0));
