const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'benmugangubenben@gmail.com';
    const user = await prisma.profile.findUnique({
        where: { email },
        select: { id: true, email: true, role: true, siteId: true, smallGroupId: true }
    });
    console.log('User Details:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
