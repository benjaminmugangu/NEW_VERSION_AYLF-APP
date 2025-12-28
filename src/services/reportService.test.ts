import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createReport } from './reportService';
import { prisma } from '@/lib/prisma';
import { deleteFile } from './storageService';

// Mocks
vi.mock('@/lib/prisma', async () => {
    return {
        prisma: { report: { create: vi.fn() } },
        withRLS: vi.fn((userId, fn) => fn())
    };
});

vi.mock('@kinde-oss/kinde-auth-nextjs/server', () => ({
    getKindeServerSession: () => ({ getUser: async () => ({ id: 'user_1' }) })
}));

vi.mock('./storageService', () => ({
    deleteFile: vi.fn()
}));

vi.mock('./auditLogService', () => ({
    createAuditLog: vi.fn()
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
            // ... other required fields
            activityDate: new Date(),
            status: 'submitted',
            content: 'test',
            thematic: 'test',
            activityTypeId: '123'
        };

        // Mock DB failure
        (prisma.report.create as any).mockRejectedValue(new Error('DB Constraint Violation'));

        await expect(createReport(reportData as any)).rejects.toThrow('DB Constraint Violation');

        // Check if deleteFile was called with correct path
        expect(deleteFile).toHaveBeenCalledWith('folder/img1.jpg', { isRollback: true });
    });

    it('should NOT trigger rollback if success', async () => {
        const reportData = { images: [{ url: 'http://ok' }] };
        (prisma.report.create as any).mockResolvedValue({ id: '1', ...reportData });

        await createReport(reportData as any);
        expect(deleteFile).not.toHaveBeenCalled();
    });
});
