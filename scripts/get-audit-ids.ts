import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sites = await prisma.site.findMany({ take: 3 });
    const groups = await prisma.smallGroup.findMany({ take: 3 });

    console.log('SITES:');
    sites.forEach(s => console.log(`- ${s.name}: ${s.id}`));

    console.log('\nGROUPS:');
    groups.forEach(g => console.log(`- ${g.name}: ${g.id} (Site: ${g.siteId})`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
