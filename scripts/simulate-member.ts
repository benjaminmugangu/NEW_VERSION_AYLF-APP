
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

async function main() {
    const userEmail = 'mugangubenjamin696@gmail.com';

    console.log(`Demoting ${userEmail} to MEMBER...`);

    // Find the verification group
    const group = await prisma.smallGroup.findFirst({
        where: { name: 'Verification Alpha' }
    });

    if (!group) throw new Error('Verification Alpha group not found');

    // Update profile
    await prisma.profile.update({
        where: { email: userEmail },
        data: {
            role: 'MEMBER',
            smallGroupId: group.id,
            siteId: group.siteId, // Inherit site from group
        }
    });

    console.log(`✅ User is now a MEMBER of ${group.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
