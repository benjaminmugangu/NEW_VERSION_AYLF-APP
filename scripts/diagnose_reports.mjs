
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("=== 🔍 DATABASE DIAGNOSIS (Raw Data) ===\n");

        // 1. Get Infor Mystique Profile
        const user = await prisma.profile.findFirst({
            where: { name: { contains: 'Infor' } },
            include: { site: true }
        });

        if (!user) {
            console.log("❌ User 'Infor' not found.");
            return;
        }

        console.log(`User: ${user.name} (ID: ${user.id})`);
        console.log(`Role: ${user.role}, Site: ${user.site?.name} (ID: ${user.siteId})`);

        // 2. Count activities for this site
        const count = await prisma.activity.count({
            where: { siteId: user.siteId }
        });
        console.log(`\nTotal activities in site ${user.site?.name}: ${count}`);

        // 3. List activities and their eligibility criteria
        const activities = await prisma.activity.findMany({
            where: { siteId: user.siteId },
            include: { reports: { select: { id: true } } },
            orderBy: { date: 'desc' },
            take: 10
        });

        const now = new Date();
        const cutoff = new Date(now.getTime() - 5 * 60 * 60 * 1000);

        console.log(`\n--- Top 10 Activities (Site Scope) ---`);
        console.log(`Current Time: ${now.toISOString()}`);
        console.log(`Cutoff Time : ${cutoff.toISOString()}`);

        for (const a of activities) {
            const isPastCutoff = new Date(a.date) <= cutoff;
            const hasReport = a.reports && a.reports.length > 0;
            const isCorrectStatus = ['planned', 'in_progress', 'delayed'].includes(a.status);
            const isReportable = isPastCutoff && !hasReport && isCorrectStatus && a.level === 'site';

            console.log(`\n- [${isReportable ? '✅' : '❌'}] "${a.title}"`);
            console.log(`  Level: ${a.level}, Status: ${a.status}`);
            console.log(`  Date: ${a.date.toISOString()}`);
            console.log(`  Checks: PastCutoff:${isPastCutoff}, NoReport:${!hasReport}, StatusOK:${isCorrectStatus}`);
            if (a.level !== 'site') console.log(`  Reason: Level is ${a.level} (Expected 'site' for SC reporting)`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
