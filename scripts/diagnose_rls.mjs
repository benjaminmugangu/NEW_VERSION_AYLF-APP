
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const userName = 'Infor';
        const user = await prisma.profile.findFirst({
            where: { name: { contains: userName } }
        });

        if (!user) {
            console.log(`❌ User ${userName} not found.`);
            return;
        }

        console.log(`=== 🛡️ RLS FUNCTION DIAGNOSIS (SIMPLE) ===`);
        console.log(`Testing as User: ${user.name} (ID: ${user.id})`);

        // Using basePrisma to set context manually and check
        const { basePrisma } = await import('../src/lib/prisma.js');

        await basePrisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id}'`);

            const myId = await tx.$queryRaw`SELECT get_my_id() as id`;
            const myRole = await tx.$queryRaw`SELECT get_my_role() as role`;
            const mySiteId = await tx.$queryRaw`SELECT get_my_site_id() as site_id`;

            console.log(`\nSQL get_my_id():`, myId[0].id);
            console.log(`SQL get_my_role():`, myRole[0].role);
            console.log(`SQL get_my_site_id():`, mySiteId[0].site_id);

            const visibleCount = await tx.$queryRaw`SELECT count(*) as count FROM activities`;
            console.log(`Total activities visible via RLS:`, visibleCount[0].count);

            const siteActivities = await tx.$queryRaw`SELECT id, title, site_id, level FROM activities`;
            console.log(`Activities visible in site:`, siteActivities.length);
            siteActivities.forEach(a => {
                console.log(`- [${a.level}] ${a.title} (Site: ${a.site_id})`);
            });
        }, { timeout: 10000 });

    } catch (e) {
        console.error("❌ Diagnostic failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
