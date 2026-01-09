
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTestData() {
    console.log('🧹 Starting safe test data cleanup...');
    console.log('⚠️  WARNING: This will delete ALL transactions, reports, activities, and profiles!');
    console.log('ℹ️  Sites and Small Groups will be PRESERVED.');

    try {
        // 1. Delete dependent data first (Leaves of the tree)
        console.log('   - Deleting Notifications...');
        await prisma.notification.deleteMany({});

        console.log('   - Deleting Audit Logs...');
        await prisma.auditLog.deleteMany({});

        console.log('   - Deleting Inventory Movements...');
        await prisma.inventoryMovement.deleteMany({});

        console.log('   - Deleting Inventory Items...');
        await prisma.inventoryItem.deleteMany({});

        // 2. Delete Financial Data (Transactions depends on Reports/Activities sometimes, but we handle order)
        console.log('   - Deleting Fund Allocations...');
        await prisma.fundAllocation.deleteMany({});

        console.log('   - Deleting Financial Transactions...');
        // We might need to handle self-referencing reversals first if strict, 
        // but deleteMany handles standard rows. 
        // If there are circular deps, we might need raw SQL or updates.
        await prisma.financialTransaction.deleteMany({});

        // 3. Delete Operational Data
        console.log('   - Deleting Reports...');
        await prisma.report.deleteMany({});

        console.log('   - Deleting Activities...');
        await prisma.activity.deleteMany({});

        console.log('   - Deleting Certificates...');
        await prisma.certificate.deleteMany({});

        console.log('   - Deleting User Invitations...');
        await prisma.userInvitation.deleteMany({});

        // 4. Delete Members (People logic)
        console.log('   - Deleting Members...');
        await prisma.member.deleteMany({});

        // 5. Delete Users/Profiles
        // NOTE: You might want to keep YOUR admin account.
        // If so, uncomment the where clause below.
        console.log('   - Deleting Profiles (Users)...');
        await prisma.profile.deleteMany({
            // where: {
            //   email: { not: 'your-email@example.com' } 
            // }
        });

        console.log('✅ Cleanup complete! Sites and Small Groups remain intact.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

cleanTestData();
