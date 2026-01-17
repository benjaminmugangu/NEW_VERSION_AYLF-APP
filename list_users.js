const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roles = ['NATIONAL_COORDINATOR', 'SITE_COORDINATOR', 'SMALL_GROUP_LEADER'];
    for (const role of roles) {
        const users = await prisma.profile.findMany({
            where: { role },
            take: 1,
            select: { id: true, name: true, email: true, role: true, siteId: true, smallGroupId: true }
        });
        console.log(`Role: ${role}`, users);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
