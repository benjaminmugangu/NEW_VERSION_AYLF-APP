import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.profile.count();
    console.log(`PROFILES: ${count}`);
    const siteCount = await prisma.site.count();
    console.log(`SITES: ${siteCount}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
