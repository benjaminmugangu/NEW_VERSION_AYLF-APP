const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const groupId = 'group-goma-ulpgl';
    const group = await prisma.smallGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, siteId: true }
    });
    console.log('Group Details:', group);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
