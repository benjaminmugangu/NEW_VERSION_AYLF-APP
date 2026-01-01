import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyScState() {
    console.log('=== SC Bidirectional Linking Verification ===\n');

    // 1. All SC profiles with their siteId
    const scs = await prisma.profile.findMany({
        where: { role: 'SITE_COORDINATOR' },
        select: { id: true, name: true, email: true, siteId: true }
    });
    console.log('1. SC Profiles with siteId:');
    console.table(scs);
    console.log(`   Total SC profiles: ${scs.length}`);
    console.log(`   SC with siteId set: ${scs.filter(s => s.siteId).length}\n`);

    // 2. All sites with their coordinatorId status
    const sites = await prisma.site.findMany({
        select: { id: true, name: true, coordinatorId: true }
    });
    console.log('2. Sites with coordinatorId:');
    console.table(sites);
    console.log(`   Total sites: ${sites.length}`);
    console.log(`   Sites with coordinatorId = NULL: ${sites.filter(s => !s.coordinatorId).length}\n`);

    // 3. Potential conflicts - multiple SC pointing to same site
    const siteIdCounts: Record<string, number> = {};
    for (const sc of scs) {
        if (sc.siteId) {
            siteIdCounts[sc.siteId] = (siteIdCounts[sc.siteId] || 0) + 1;
        }
    }
    const conflicts = Object.entries(siteIdCounts).filter(([, count]) => count > 1);
    console.log('3. Conflict Check (multiple SC per site):');
    if (conflicts.length === 0) {
        console.log('   ✅ No conflicts found. Each site has at most 1 SC pointing to it.\n');
    } else {
        console.log('   ⚠️ CONFLICTS DETECTED:');
        console.table(conflicts);
    }

    // 4. RLS usage check - grep for coordinatorId in policies would need raw SQL
    console.log('4. Summary:');
    console.log(`   - ${scs.length} SC profiles exist`);
    console.log(`   - ${sites.filter(s => !s.coordinatorId).length} sites have NULL coordinatorId (need repair)`);
    console.log(`   - ${conflicts.length} conflicts detected`);

    await prisma.$disconnect();
}

verifyScState().catch(console.error);
