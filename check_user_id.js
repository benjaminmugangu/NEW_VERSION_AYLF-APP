const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'benmugangubenben@gmail.com';
    // Note: Model is Profile, not User
    const user = await prisma.profile.findUnique({
        where: { email },
        select: { id: true, email: true, role: true }
    });
    console.log('User found:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
