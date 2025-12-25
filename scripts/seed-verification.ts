
import { prisma } from '@/lib/prisma';

async function main() {
    const userEmail = 'mugangubenjamin696@gmail.com'; // The current user

    console.log(`Setting up verification environment for ${userEmail}...`);

    // 1. Get the user
    const user = await prisma.profile.findUnique({
        where: { email: userEmail },
    });

    if (!user) {
        console.error('User not found!');
        process.exit(1);
    }

    // 2. Create Test Site
    const siteName = 'Test Site - Verification';
    let site = await prisma.site.findFirst({
        where: { name: siteName }
    });

    if (!site) {
        site = await prisma.site.create({
            data: {
                name: siteName,
                city: 'Test City',
                country: 'Test Country',
            }
        });
        console.log(`✅ Created Site: ${site.name} (${site.id})`);
    } else {
        console.log(`ℹ️ Site already exists: ${site.name}`);
    }

    // 3. Create Small Group
    const groupName = 'Verification Alpha';
    let group = await prisma.smallGroup.findFirst({
        where: { name: groupName }
    });

    if (!group) {
        group = await prisma.smallGroup.create({
            data: {
                name: groupName,
                siteId: site.id,
                meetingDay: 'Monday',
                meetingTime: '18:00'
            }
        });
        console.log(`✅ Created Group: ${group.name} (${group.id})`);
    } else {
        console.log(`ℹ️ Group already exists: ${group.name}`);
    }

    console.log('Environment setup complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
