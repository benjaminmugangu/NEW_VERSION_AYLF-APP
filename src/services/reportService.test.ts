import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReport } from './reportService';
import { prisma } from '@/lib/prisma';
import { deleteFile } from './storageService';

// Mock Dependencies
const { mockPrisma } = vi.hoisted(() => {
    const mockPrismaInstance = {
        report: {
            create: vi.fn(),
            update: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
        },
        profile: {
            findMany: vi.fn(() => Promise.resolve([])),
        },
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
    withRLS: vi.fn((userId, fn) => fn())
}));

vi.mock('@kinde-oss/kinde-auth-nextjs/server', () => ({
    getKindeServerSession: () => ({ getUser: async () => ({ id: 'user_1' }) })
}));

vi.mock('./storageService', () => ({
    deleteFile: vi.fn().mockResolvedValue(undefined),
    extractFilePath: vi.fn((url) => {
        const parts = url.split('/public/report-images/');
        return parts.length > 1 ? parts[1] : url;
    }),
}));

vi.mock('./auditLogService', () => ({
    createAuditLog: vi.fn(),
    logReportApproval: vi.fn(),
}));

describe('Report Service Atomic Rollback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should trigger rollback of images when DB creation fails', async () => {
        const reportData = {
            title: 'Test',
            level: 'national',
            images: [
                { name: 'img1.jpg', url: 'https://site.com/storage/v1/object/public/report-images/folder/img1.jpg' }
            ],
            activityDate: new Date(),
            status: 'submitted',
            content: 'test',
            thematic: 'test',
            activityTypeId: '123'
        };

        // Mock DB failure
        mockPrisma.report.create.mockRejectedValue(new Error('DB Constraint Violation'));

        const result = await createReport(reportData as any);
        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('DB Constraint Violation');

        // Check if deleteFile was called with correct path (un-signing the Supabase URL)
        expect(deleteFile).toHaveBeenCalledWith('folder/img1.jpg', { isRollback: true });
    });

    it('should NOT trigger rollback if success', async () => {
        const reportData = {
            images: [{ url: 'http://ok/folder/img1.jpg' }],
            title: 'Test',
            level: 'national',
            activityDate: new Date(),
            status: 'submitted',
            content: 'test',
            thematic: 'test',
            activityTypeId: '123'
        };
        mockPrisma.report.create.mockResolvedValue({
            id: '1',
            ...reportData,
            images: reportData.images, // JSON
            submittedBy: { name: 'Test' }
        });

        const result = await createReport(reportData as any);
        expect(result.success).toBe(true);
        expect(deleteFile).not.toHaveBeenCalled();
    });
});
