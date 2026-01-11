import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma, basePrisma } from '@/lib/prisma';
import { checkPeriod, isPeriodClosed, createAccountingPeriod, closeAccountingPeriod } from './accountingService';

// Mock Kinde Auth
vi.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
    getKindeServerSession: () => ({
        getUser: () => Promise.resolve({ id: 'test-admin-user' })
    })
}));

describe('AccountingService - Integration Tests', () => {
    let testAdminId = 'test-admin-user';

    beforeAll(async () => {
        // Setup admin profile
        await basePrisma.profile.upsert({
            where: { id: testAdminId },
            update: {},
            create: {
                id: testAdminId,
                email: 'admin@test.com',
                name: 'Test Admin',
                role: 'NATIONAL_COORDINATOR',
            }
        });
    });

    afterAll(async () => {
        // Cleanup
        await basePrisma.accountingPeriod.deleteMany({
            where: { OR: [{ status: 'open' }, { status: 'closed' }] }
        });
        await basePrisma.profile.delete({ where: { id: testAdminId } });
    });

    describe('Period Management', () => {
        it('should create an accounting period', async () => {
            const period = await createAccountingPeriod({
                type: 'month',
                startDate: new Date('2026-05-01'),
                endDate: new Date('2026-05-31')
            });

            expect(period).toBeDefined();
            expect(period.status).toBe('open');
        });

        it('should prevent overlapping periods', async () => {
            await expect(createAccountingPeriod({
                type: 'month',
                startDate: new Date('2026-05-15'),
                endDate: new Date('2026-06-15')
            })).rejects.toThrow(/overlap/i);
        });
    });

    describe('Period Closure Enforcement', () => {
        let periodId: string;

        beforeAll(async () => {
            const period = await basePrisma.accountingPeriod.create({
                data: {
                    type: 'month',
                    startDate: new Date('2026-04-01'),
                    endDate: new Date('2026-04-30'),
                    status: 'closed' // Pre-closed for test
                }
            });
            periodId = period.id;
        });

        it('should identify a closed period', async () => {
            const result = await isPeriodClosed(new Date('2026-04-15'));
            expect(result.closed).toBe(true);
            expect(result.period?.id).toBe(periodId);
        });

        it('should throw error when checking a closed period', async () => {
            await expect(checkPeriod(new Date('2026-04-10'), 'Test Action'))
                .rejects.toThrow(/PERIOD_CLOSED/);
        });

        it('should allow an open period', async () => {
            // May period is open (created in first test)
            await expect(checkPeriod(new Date('2026-05-10'), 'Test Action'))
                .resolves.not.toThrow();
        });
    });
});
