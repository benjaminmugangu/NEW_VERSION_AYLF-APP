const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roles = [
        { role: 'SITE_COORDINATOR', email: 'audit-sc@test.com', name: 'Audit SC' },
        { role: 'SMALL_GROUP_LEADER', email: 'audit-sgl@test.com', name: 'Audit SGL' },
        { role: 'MEMBER', email: 'audit-member@test.com', name: 'Audit Member' }
    ];

    const results = {};

    // Get existing NC
    results['NATIONAL_COORDINATOR'] = await prisma.profile.findFirst({
        where: { role: 'NATIONAL_COORDINATOR' },
        select: { id: true, email: true, name: true }
    });

    for (const item of roles) {
        let user = await prisma.profile.findUnique({
            where: { email: item.email },
            select: { id: true, email: true, name: true, role: true }
        });

        if (!user) {
            console.log(`Creating ${item.role}...`);
            user = await prisma.profile.create({
                data: {
                    id: `audit-${item.role.toLowerCase()}`,
                    email: item.email,
                    name: item.name,
                    role: item.role,
                    status: 'active'
                },
                select: { id: true, email: true, name: true, role: true }
            });
        }
        results[item.role] = user;
    }

    console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
