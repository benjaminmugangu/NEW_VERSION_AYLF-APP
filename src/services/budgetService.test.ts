import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma, basePrisma } from '@/lib/prisma';
import { calculateAvailableBudget, checkBudgetIntegrity, calculateBudgetAggregates } from './budgetService';
import { Decimal } from '@prisma/client/runtime/library';

describe('BudgetService - Integration Tests', () => {
    let testSiteId: string;
    let testSmallGroupId: string;
    let userId: string;

    beforeAll(async () => {
        try {
            // Idempotent cleanup: delete existing test data if any
            // We use basePrisma to bypass RLS for administrative setup
            await Promise.all([
                basePrisma.fundAllocation.deleteMany({ where: { goal: { contains: 'Budget' } } }),
                basePrisma.financialTransaction.deleteMany({ where: { description: { contains: 'Expense' } } }),
                basePrisma.smallGroup.deleteMany({ where: { name: 'Test Small Group' } }),
                basePrisma.site.deleteMany({ where: { name: 'Test Site for Budget' } }),
                basePrisma.profile.deleteMany({ where: { id: 'test-budget-user' } })
            ]).catch(e => console.warn('Pre-test cleanup warning:', e.message));

            // Setup test data
            const site = await basePrisma.site.create({
                data: {
                    name: 'Test Site for Budget',
                    city: 'Test City',
                    country: 'Test Country',
                },
            });
            testSiteId = site.id;

            const smallGroup = await basePrisma.smallGroup.create({
                data: {
                    name: 'Test Small Group',
                    siteId: testSiteId,
                },
            });
            testSmallGroupId = smallGroup.id;

            const profile = await basePrisma.profile.create({
                data: {
                    id: 'test-budget-user',
                    email: 'budget-test@example.com',
                    name: 'Budget Test User',
                    role: 'NATIONAL_COORDINATOR',
                },
            });
            userId = profile.id;
        } catch (error: any) {
            console.error('FAILED TO SETUP TEST DATA:', error);
            if (error.code) console.error('Prisma Error Code:', error.code);
            throw error;
        }
    }, 30000); // 30s timeout for complex setup

    afterAll(async () => {
        try {
            // Cleanup using basePrisma to ensure all related data is removed regardless of RLS
            await basePrisma.fundAllocation.deleteMany({
                where: { OR: [{ siteId: testSiteId }, { fromSiteId: testSiteId }] }
            });
            await basePrisma.financialTransaction.deleteMany({ where: { siteId: testSiteId } });
            await basePrisma.smallGroup.deleteMany({ where: { siteId: testSiteId } });
            await basePrisma.site.delete({ where: { id: testSiteId } });
            await basePrisma.profile.delete({ where: { id: userId } });
            console.log('Test environment cleanup complete');
        } catch (e) {
            console.error('Cleanup failed:', e);
        }
    }, 20000); // Increased timeout to 20s for DB cleanup

    beforeEach(async () => {
        // Clear transactional data before each test
        await basePrisma.fundAllocation.deleteMany({
            where: { OR: [{ siteId: testSiteId }, { fromSiteId: testSiteId }] }
        });
        await basePrisma.financialTransaction.deleteMany({ where: { siteId: testSiteId } });
    });

    describe('calculateAvailableBudget', () => {
        it('should calculate site budget with allocations and expenses', async () => {
            // Create test allocation (received by site)
            await basePrisma.fundAllocation.create({
                data: {
                    amount: new Decimal(1000),
                    allocationDate: new Date(),
                    goal: 'Test Budget',
                    source: 'National',
                    status: 'completed',
                    allocationType: 'hierarchical',
                    allocatedById: userId,
                    siteId: testSiteId,
                },
            });

            // Create test expense
            await basePrisma.financialTransaction.create({
                data: {
                    date: new Date(),
                    description: 'Test Expense',
                    amount: new Decimal(300),
                    type: 'expense',
                    category: 'operations',
                    status: 'approved',
                    siteId: testSiteId,
                    recordedById: userId,
                },
            });

            const result = await calculateAvailableBudget({ siteId: testSiteId });

            expect(result.received).toBe(1000);
            expect(result.expenses).toBe(300);
            expect(result.available).toBe(700);
        });

        it('should return zero for site with no allocations', async () => {
            const result = await calculateAvailableBudget({ siteId: testSiteId });

            expect(result.received).toBe(0);
            expect(result.sent).toBe(0);
            expect(result.expenses).toBe(0);
            expect(result.available).toBe(0);
        });

        it('should correctly handle site sending funds to small group', async () => {
            // Site receives from national
            await basePrisma.fundAllocation.create({
                data: {
                    amount: new Decimal(1000),
                    allocationDate: new Date(),
                    goal: 'Site Budget',
                    source: 'National',
                    status: 'completed',
                    allocationType: 'hierarchical',
                    allocatedById: userId,
                    siteId: testSiteId,
                },
            });

            // Site sends to small group
            await basePrisma.fundAllocation.create({
                data: {
                    amount: new Decimal(400),
                    allocationDate: new Date(),
                    goal: 'Group Budget',
                    source: 'Site',
                    status: 'completed',
                    allocationType: 'hierarchical',
                    allocatedById: userId,
                    fromSiteId: testSiteId,
                    smallGroupId: testSmallGroupId,
                },
            });

            const result = await calculateAvailableBudget({ siteId: testSiteId });

            expect(result.received).toBe(1000);
            expect(result.sent).toBe(400);
            expect(result.available).toBe(600);
        });
    });

    describe('checkBudgetIntegrity', () => {
        it('should detect budget overrun when expenses exceed allocations', async () => {
            // Create small allocation
            await basePrisma.fundAllocation.create({
                data: {
                    amount: new Decimal(100),
                    allocationDate: new Date(),
                    goal: 'Small Budget',
                    source: 'Test',
                    status: 'completed',
                    allocationType: 'hierarchical',
                    allocatedById: userId,
                    siteId: testSiteId,
                },
            });

            // Create large expense (exceeds allocation)
            await basePrisma.financialTransaction.create({
                data: {
                    date: new Date(),
                    description: 'Large Expense',
                    amount: new Decimal(500),
                    type: 'expense',
                    category: 'operations',
                    status: 'approved',
                    siteId: testSiteId,
                    recordedById: userId,
                },
            });

            const result = await checkBudgetIntegrity({ siteId: testSiteId });

            expect(result.isOverrun).toBe(true);
            expect(result.balance).toBe(-400);  // 100 - 500 = -400
        });

        it('should return no overrun when budget is healthy', async () => {
            await basePrisma.fundAllocation.create({
                data: {
                    amount: new Decimal(1000),
                    allocationDate: new Date(),
                    goal: 'Healthy Budget',
                    source: 'Test',
                    status: 'completed',
                    allocationType: 'hierarchical',
                    allocatedById: userId,
                    siteId: testSiteId,
                },
            });

            const result = await checkBudgetIntegrity({ siteId: testSiteId });

            expect(result.isOverrun).toBe(false);
            expect(result.balance).toBe(1000);
        });
    });

    describe('calculateBudgetAggregates', () => {
        it('should aggregate site financial data for dashboard', async () => {
            // Create mixed financial data
            await basePrisma.fundAllocation.create({
                data: {
                    amount: new Decimal(2000),
                    allocationDate: new Date(),
                    goal: 'Main Budget',
                    source: 'National',
                    status: 'completed',
                    allocationType: 'hierarchical',
                    allocatedById: userId,
                    siteId: testSiteId,
                },
            });

            await basePrisma.financialTransaction.create({
                data: {
                    date: new Date(),
                    description: 'Expense 1',
                    amount: new Decimal(200),
                    type: 'expense',
                    category: 'operations',
                    status: 'approved',
                    siteId: testSiteId,
                    recordedById: userId,
                },
            });

            await basePrisma.financialTransaction.create({
                data: {
                    date: new Date(),
                    description: 'Income 1',
                    amount: new Decimal(150),
                    type: 'income',
                    category: 'donations',
                    status: 'approved',
                    siteId: testSiteId,
                    recordedById: userId,
                },
            });

            const result = await calculateBudgetAggregates({
                role: 'SITE_COORDINATOR',
                siteId: testSiteId,
                dateFilter: {},
            });

            expect(result.totalAllocationsReceived).toBe(2000);
            expect(result.expenses).toBe(200); // Note: property name is 'expenses' in service
            expect(result.totalDirectIncome).toBe(150);
            expect(result.netBalance).toBe(1950);  // 2000 + 150 - 200 (Note: totalAllocated is 0 here)
        });
    });
});
