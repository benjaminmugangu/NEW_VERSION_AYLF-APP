import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction } from './transactionService';
import { prisma } from '@/lib/prisma';
import { deleteFile } from './storageService';

// Mock Dependencies
const { mockPrisma } = vi.hoisted(() => {
    const mockPrismaInstance = {
        financialTransaction: {
            create: vi.fn(),
            update: vi.fn(),
        },
        activity: {
            findUnique: vi.fn(),
        },
        auditLog: { create: vi.fn() },
        idempotencyKey: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
        },
        $executeRawUnsafe: vi.fn(),
        $transaction: vi.fn(async (callback) => {
            if (typeof callback === 'function') {
                return await callback(mockPrismaInstance);
            }
            return callback;
        }),
    };
    return { mockPrisma: mockPrismaInstance };
});

vi.mock('@/lib/prisma', () => ({
    prisma: mockPrisma,
    basePrisma: mockPrisma,
    withRLS: vi.fn((userId, fn) => fn()),
}));

vi.mock('@kinde-oss/kinde-auth-nextjs/server', () => ({
    getKindeServerSession: () => ({
        getUser: async () => ({ id: 'user_123' }),
    }),
}));

vi.mock('./storageService', () => ({
    deleteFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./auditLogService', () => ({
    logTransactionCreation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./accountingService', () => ({
    checkPeriod: vi.fn(() => Promise.resolve()),
}));

describe('Transaction Service Atomic Rollback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger rollback of proofUrl if DB creation fails', async () => {
        const formData = {
            amount: 100,
            date: new Date(),
            description: 'Test',
            type: 'income',
            category: 'test',
            recordedById: 'user_123',
            proofUrl: 'reports/123/proof.pdf',
        } as any;

        // Mock DB Failure
        mockPrisma.financialTransaction.create.mockRejectedValue(new Error('DB Constraint Violation'));

        // Act
        const result = await createTransaction(formData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('DB Constraint Violation');

        // Verify Rollback
        expect(deleteFile).toHaveBeenCalledTimes(1);
        expect(deleteFile).toHaveBeenCalledWith('reports/123/proof.pdf', { isRollback: true });
    });

    it('should NOT trigger rollback if DB creation succeeds', async () => {
        const formData = {
            amount: 100,
            recordedById: 'user_123',
            proofUrl: 'reports/123/proof.pdf',
            date: new Date(),
            type: 'income',
            category: 'test',
            description: 'Test',
        } as any;

        // Mock Success
        mockPrisma.financialTransaction.create.mockResolvedValue({
            id: 'tx_1',
            ...formData,
            recordedBy: { name: 'Test User' },
        });

        const result = await createTransaction(formData);

        expect(result.success).toBe(true);
        expect(deleteFile).not.toHaveBeenCalled();
    });
});
