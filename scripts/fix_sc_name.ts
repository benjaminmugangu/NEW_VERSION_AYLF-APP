
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixScName() {
    console.log('--- Updating SC Profile Name ---');

    const updated = await prisma.profile.update({
        where: { email: 'informystique@gmail.com' },
        data: { name: 'Benjamin Mugangu 2 (SC)' }
    });

    console.log('✅ Name updated successfully:', updated.name);

    // Verify Site reflects this
    const site = await prisma.site.findUnique({
        where: { id: updated.siteId! },
        include: { coordinator: true }
    });

    console.log(`Site: ${site?.name}`);
    console.log(`Site Coordinator Name: ${site?.coordinator?.name}`);
}

fixScName()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
