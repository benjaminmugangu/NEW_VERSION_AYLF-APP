import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransaction } from './transactionService';
import { prisma } from '@/lib/prisma';
import { deleteFile } from './storageService';

// Mock Dependencies
vi.mock('@/lib/prisma', () => ({
    prisma: {
        financialTransaction: {
            create: vi.fn(),
            update: vi.fn(),
        },
        activity: { // for resolveTransactionContext
            findUnique: vi.fn(),
        },
        auditLog: { create: vi.fn() }
    },
    withRLS: vi.fn((userId, fn) => fn()), // Bypass RLS wrapper
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

describe('Transaction Service Atomic Rollback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger rollback of proofUrl if DB creation fails', async () => {
        const formData = {
            amount: 100,
            date: new Date(),
            description: 'Test',
            type: 'expense',
            category: 'test',
            recordedById: 'user_123',
            proofUrl: 'reports/123/proof.pdf', // Dangling file
        } as any;

        // Mock DB Failure
        (prisma.financialTransaction.create as any).mockRejectedValue(new Error('DB Constraint Violation'));

        // Execute and Expect Error
        await expect(createTransaction(formData)).rejects.toThrow('DB Constraint Violation');

        // Verify Rollback
        expect(deleteFile).toHaveBeenCalledTimes(1);
        expect(deleteFile).toHaveBeenCalledWith('reports/123/proof.pdf', { isRollback: true });
    });

    it('should NOT trigger rollback if DB creation succeeds', async () => {
        const formData = {
            amount: 100,
            recordedById: 'user_123',
            proofUrl: 'reports/123/proof.pdf',
        } as any;

        // Mock Success
        (prisma.financialTransaction.create as any).mockResolvedValue({
            id: 'tx_1',
            ...formData,
        });

        await createTransaction(formData);

        expect(deleteFile).not.toHaveBeenCalled();
    });
});
