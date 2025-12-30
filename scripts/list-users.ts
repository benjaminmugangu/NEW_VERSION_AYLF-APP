import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.profile.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            name: true
        },
        take: 20
    });
    console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
