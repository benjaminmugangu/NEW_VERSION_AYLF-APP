
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    console.log('--- DIAGNOSIS: User Profile vs Group Site ---');

    const emails = ['benprobenpro37@gmail.com', 'benmugangubenben@gmail.com'];

    // 1. Fetch Profiles
    const users = await prisma.profile.findMany({
        where: { email: { in: emails } },
        select: { email: true, role: true, siteId: true, smallGroupId: true }
    });
    console.log('\nACTUAL PROFILES:');
    console.table(users);

    // 2. Fetch their Groups
    const groupIds = users.filter(u => u.smallGroupId).map(u => u.smallGroupId!);
    const groups = await prisma.smallGroup.findMany({
        where: { id: { in: groupIds } },
        select: { id: true, name: true, siteId: true }
    });
    console.log('\nSMALL GROUPS:');
    console.table(groups);
}

diagnose()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
