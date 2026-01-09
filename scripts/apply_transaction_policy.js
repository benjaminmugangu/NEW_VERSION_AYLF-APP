
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyPolicy() {
    console.log('🔒 Applying strict RLS policy for transactions...');
    try {
        const sqlPath = path.join(__dirname, '../database/policies/transactions.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon, filter empty statements
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await prisma.$executeRawUnsafe(statement);
        }
        console.log('✅ Policy applied successfully.');
    } catch (e) {
        console.error('❌ Failed to apply policy:', e);
    } finally {
        await prisma.$disconnect();
    }
}

applyPolicy();
