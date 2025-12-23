const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function auditIdentitySync() {
    console.log('=== KINDE-SUPABASE IDENTITY SYNCHRONIZATION AUDIT ===\n');

    try {
        // Get all profiles
        const profiles = await prisma.profile.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' }
        });

        console.log(`Total profiles in database: ${profiles.length}\n`);

        // Check for potential issues
        const issues = {
            suspicious: [],
            invited: [],
            active: [],
        };

        for (const profile of profiles) {
            const info = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                status: profile.status,
                createdAt: profile.createdAt.toISOString(),
            };

            if (profile.status === 'invited') {
                issues.invited.push(info);
            } else if (profile.status === 'active') {
                issues.active.push(info);
            }

            // Check for suspicious patterns in ID
            if (profile.id.startsWith('kp_')) {
                // Kinde IDs start with kp_
                issues.active.push({ ...info, note: 'Valid Kinde ID format' });
            } else {
                issues.suspicious.push({ ...info, note: 'Non-Kinde ID format' });
            }
        }

        console.log('--- ACTIVE USERS ---');
        console.log(`Count: ${issues.active.length}`);
        issues.active.forEach(u => {
            console.log(`  ${u.email} | ${u.id.substring(0, 15)}... | ${u.role}`);
        });

        console.log('\n--- INVITED USERS (Not Yet Logged In) ---');
        console.log(`Count: ${issues.invited.length}`);
        issues.invited.forEach(u => {
            console.log(`  ${u.email} | ${u.id.substring(0, 15)}... | ${u.role}`);
        });

        console.log('\n--- SUSPICIOUS IDs (Non-Kinde Format) ---');
        console.log(`Count: ${issues.suspicious.length}`);
        if (issues.suspicious.length > 0) {
            console.log('⚠️  WARNING: These profiles may have ID mismatches!');
            issues.suspicious.forEach(u => {
                console.log(`  ${u.email} | ${u.id} | ${u.note}`);
            });
        } else {
            console.log('✅ All IDs follow Kinde format (kp_*)');
        }

        console.log('\n=== RECOMMENDATIONS ===');
        if (issues.suspicious.length > 0) {
            console.log('⚠️  CRITICAL: Manual review required for non-Kinde IDs');
            console.log('   These users may have been created before Kinde integration');
            console.log('   or have ID synchronization issues.');
            console.log('\n   Next steps:');
            console.log('   1. Verify these users can log in successfully');
            console.log('   2. Check Kinde dashboard for their actual Kinde IDs');
            console.log('   3. Run migration script to update IDs if needed');
        } else {
            console.log('✅ All profile IDs appear to be properly synchronized with Kinde');
        }

        if (issues.invited.length > 0) {
            console.log(`\n📧 ${issues.invited.length} users are invited but haven't logged in yet`);
            console.log('   These will receive their Kinde IDs upon first login');
        }

    } catch (error) {
        console.error('Audit failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

auditIdentitySync();
