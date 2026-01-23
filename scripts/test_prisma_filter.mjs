
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testFilter() {
    try {
        const siteId = 'site-goma';

        console.log(`--- Testing 'reports: null' ---`);
        const nullResult = await prisma.activity.findMany({
            where: { siteId, reports: null },
            take: 3
        });
        console.log(`Found with 'null': ${nullResult.length}`);

        console.log(`\n--- Testing 'reports: { none: {} }' ---`);
        try {
            const noneResult = await prisma.activity.findMany({
                where: { siteId, reports: { none: {} } },
                take: 3
            });
            console.log(`Found with 'none: {}': ${noneResult.length}`);
        } catch (e) {
            console.log(`❌ 'none: {}' failed: ${e.message.split('\n')[0]}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testFilter();
