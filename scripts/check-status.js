
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const total = await prisma.financialTransaction.count();
    const system = await prisma.financialTransaction.count({ where: { isSystemGenerated: true } });
    const linked = await prisma.financialTransaction.count({ where: { relatedReportId: { not: null } } });

    console.log('--- Database Status ---');
    console.log('Total Transactions:', total);
    console.log('Transactions marked as System:', system);
    console.log('Transactions linked to Reports:', linked);
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
