const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Applying SQL RLS Fixes (Sequential) ---');

    const sqlPath = path.join(__dirname, 'database', 'rls_prisma_fix.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`Error: SQL file not found at ${sqlPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('Attempting to connect...');
        await prisma.$connect();
        console.log('Connected.');

        // Split by semicolons, but filter out empty statements
        // This is safe for simple scripts without semicolons inside strings
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Executing ${statements.length} statements...`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            await prisma.$executeRawUnsafe(stmt);
        }

        console.log('--- Successfully applied RLS fixes ---');
    } catch (error) {
        console.error('--- Failed to apply RLS fixes ---');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
