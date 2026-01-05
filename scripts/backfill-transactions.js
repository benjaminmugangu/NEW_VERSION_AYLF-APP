
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
    console.log('Starting backfill of isSystemGenerated field...');
    const result = await prisma.financialTransaction.updateMany({
        where: {
            relatedReportId: { not: null }
        },
        data: {
            isSystemGenerated: true
        }
    });
    console.log(`Updated ${result.count} transactions.`);
}

backfill()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
