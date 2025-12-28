import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateRaceCondition() {
    console.log('🚀 Starting Stress Test: Concurrent Idempotency Simulation');
    const key = `stress_test_${Date.now()}`;
    const payload = { test: 'data' };

    // Simulate 10 concurrent requests trying to claim the same key
    const threads = Array.from({ length: 10 }).map(async (_, i) => {
        try {
            await prisma.$transaction(async (tx) => {
                const existing = await tx.idempotencyKey.findUnique({ where: { key } });
                if (existing) {
                    return `Thread ${i}: Cache Hit`;
                }

                // Simulate processing delay
                await new Promise(r => setTimeout(r, Math.random() * 100));

                await tx.idempotencyKey.create({
                    data: {
                        key,
                        response: JSON.stringify({ processedBy: i }),
                    }
                });
                return `Thread ${i}: PROCESSED`;
            });
        } catch (e) {
            return `Thread ${i}: BLOCKED (Constraint Violation)`;
        }
    });

    const results = await Promise.all(threads);

    const processedCount = results.filter(r => r.includes('PROCESSED')).length;
    const blockedCount = results.filter(r => r.includes('BLOCKED')).length;
    const cacheHitCount = results.filter(r => r.includes('Cache Hit')).length;

    console.log('Results:', results);
    console.log(`✅ Processed: ${processedCount} (Should be 1)`);
    console.log(`🛡️ Blocked/Cached: ${blockedCount + cacheHitCount} (Should be 9)`);

    if (processedCount !== 1) {
        console.error('❌ FAIL: Idempotency Leaked!');
        process.exit(1);
    } else {
        console.log('✅ PASS: Perfect Idempotency under stress.');
    }
}

simulateRaceCondition()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
