
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDiscrepancy() {
    console.log('--- Checking for Invitation vs Profile discrepancies ---');

    const emails = ['benprobenpro37@gmail.com', 'benmugangubenben@gmail.com', 'informystique@gmail.com'];

    // 1. Fetch Profiles (Current Truth)
    const profiles = await prisma.profile.findMany({
        where: { email: { in: emails } },
        select: { email: true, role: true, siteId: true, smallGroupId: true }
    });
    console.log('\nACTUAL PROFILES (The Truth):');
    console.table(profiles);

    // 2. Fetch Invitations (What is shown in UI)
    const invites = await prisma.userInvitation.findMany({
        where: { email: { in: emails } },
        select: { email: true, role: true, siteId: true, smallGroupId: true, status: true }
    });
    console.log('\nINVITATION RECORDS (Stale Data?):');
    console.table(invites);
}

checkDiscrepancy()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
