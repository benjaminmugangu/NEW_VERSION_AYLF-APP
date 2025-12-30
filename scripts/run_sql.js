const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const sqlFile = path.join(process.cwd(), 'scripts', 'populate_real_data.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolon but handle potential ones inside quotes if needed
    // For this specific file, simple split is fine
    const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);

    console.log(`🚀 Starting population of ${queries.length} queries...`);

    for (const [index, query] of queries.entries()) {
        try {
            console.log(`[${index + 1}/${queries.length}] Executing query...`);
            await prisma.$executeRawUnsafe(query);
        } catch (error) {
            console.error(`❌ Error in query ${index + 1}:`, error.message);
        }
    }

    console.log('✅ Population complete!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
