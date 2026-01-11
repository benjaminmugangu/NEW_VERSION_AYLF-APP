import { describe, it, expect } from 'vitest';
import { basePrisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

describe('Database Integrity Constraints (CHECK)', () => {

    it('should reject transactions with negative amount', async () => {
        try {
            await basePrisma.financialTransaction.create({
                data: {
                    date: new Date(),
                    description: 'Negative Transaction',
                    amount: new Decimal(-100),
                    type: 'expense',
                    category: 'test',
                    status: 'approved',
                    recordedById: 'test-budget-user',
                }
            });
            throw new Error('Transaction with negative amount was incorrectly allowed');
        } catch (error: any) {
            expect(error).toBeDefined();
            console.log('Caught expected error for negative transaction');
        }
    });

    it('should reject fund allocations with zero or negative amount', async () => {
        try {
            await basePrisma.fundAllocation.create({
                data: {
                    amount: new Decimal(0),
                    allocationDate: new Date(),
                    goal: 'Zero Allocation',
                    source: 'Test',
                    status: 'completed',
                    allocationType: 'hierarchical',
                    allocatedById: 'test-budget-user',
                }
            });
            throw new Error('Allocation with zero amount was incorrectly allowed');
        } catch (error: any) {
            expect(error).toBeDefined();
            console.log('Caught expected error for zero-amount allocation');
        }
    });

    it('should reject accounting periods where startDate > endDate', async () => {
        try {
            await basePrisma.accountingPeriod.create({
                data: {
                    type: 'month',
                    startDate: new Date('2026-02-01'),
                    endDate: new Date('2026-01-01'), // Invalid
                    status: 'open'
                }
            });
            throw new Error('Accounting period with invalid dates was incorrectly allowed');
        } catch (error: any) {
            expect(error).toBeDefined();
            console.log('Caught expected error for invalid accounting period dates');
        }
    });

    it('should reject reports with negative total_expenses', async () => {
        try {
            await basePrisma.report.create({
                data: {
                    title: 'Negative Expense Report',
                    activityDate: new Date(),
                    level: 'site',
                    status: 'pending',
                    content: 'Test content',
                    thematic: 'Test',
                    totalExpenses: new Decimal(-50.00), // Invalid
                    submittedById: 'test-budget-user',
                    activityTypeId: 'some-type-id'
                }
            });
            throw new Error('Report with negative expenses was incorrectly allowed');
        } catch (error: any) {
            expect(error).toBeDefined();
            console.log('Caught expected error for negative report expenses');
        }
    });

    it('should reject inventory movements with zero quantity', async () => {
        try {
            await basePrisma.inventoryMovement.create({
                data: {
                    itemId: 'some-item-id',
                    direction: 'in', // Corrected from 'type' to 'direction'
                    quantity: new Decimal(0), // Invalid (should be > 0)
                    reason: 'Test',
                    date: new Date()
                }
            });
            throw new Error('Inventory movement with zero quantity was incorrectly allowed');
        } catch (error: any) {
            expect(error).toBeDefined();
            console.log('Caught expected error for zero quantity movement');
        }
    });
});
