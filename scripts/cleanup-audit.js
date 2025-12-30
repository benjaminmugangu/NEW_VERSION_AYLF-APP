const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const emails = ['audit-sc@test.com', 'audit-sgl@test.com', 'audit-member@test.com'];
    const result = await prisma.profile.deleteMany({
        where: { email: { in: emails } }
    });
    console.log(`Deleted ${result.count} audit users.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
