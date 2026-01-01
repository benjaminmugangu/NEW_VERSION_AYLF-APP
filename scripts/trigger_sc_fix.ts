
import { getSyncProfile } from '@/services/authService';
import { prisma } from '@/lib/prisma';

async function triggerFix() {
    console.log('--- Triggering SC Logic for Goma (informystique@gmail.com) ---');

    // 1. Simulate login for Goma SC
    // We need the Kinde ID for this user. Let's fetch it first.
    const scProfile = await prisma.profile.findUnique({
        where: { email: 'informystique@gmail.com' }
    });

    if (!scProfile) {
        console.error('❌ SC Profile not found!');
        process.exit(1);
    }

    console.log(`Found SC Profile: ${scProfile.id}`);

    // Call getSyncProfile to trigger the fix
    await getSyncProfile({
        id: scProfile.id,
        email: scProfile.email,
        given_name: 'Goma',
        family_name: 'Coordinator'
    });

    console.log('✅ getSyncProfile called. Checking DB state...');

    // 2. Verify Site.coordinatorId
    const site = await prisma.site.findUnique({
        where: { id: scProfile.siteId! },
        select: { id: true, name: true, coordinatorId: true }
    });

    console.log('--- Verification Result ---');
    console.log(`Site: ${site?.name}`);
    console.log(`CoordinatorId: ${site?.coordinatorId}`);

    if (site?.coordinatorId === scProfile.id) {
        console.log('✅ SUCCESS: Coordinator correctly linked to Site!');
    } else {
        console.error('❌ FAIL: CoordinatorId is still null or incorrect.');
    }
}

triggerFix()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
