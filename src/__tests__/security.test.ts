import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkDeletionEligibility } from '@/lib/safetyChecks';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        report: { findFirst: vi.fn() },
        activity: { findFirst: vi.fn() },
        financialTransaction: { findFirst: vi.fn() },
    },
}));

import { prisma } from '@/lib/prisma';

describe('Security: User Deletion Eligibility', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should REJECT deletion if user has reports', async () => {
        (prisma.report.findFirst as any).mockResolvedValue({ id: 'rep-1' });
        (prisma.activity.findFirst as any).mockResolvedValue(null);
        (prisma.financialTransaction.findFirst as any).mockResolvedValue(null);

        const result = await checkDeletionEligibility('user-1');
        expect(result.canDelete).toBe(false);
        expect(result.reason).toContain('Reports');
    });

    it('should REJECT deletion if user has activities', async () => {
        (prisma.report.findFirst as any).mockResolvedValue(null);
        (prisma.activity.findFirst as any).mockResolvedValue({ id: 'act-1' });
        (prisma.financialTransaction.findFirst as any).mockResolvedValue(null);

        const result = await checkDeletionEligibility('user-1');
        expect(result.canDelete).toBe(false);
        expect(result.reason).toContain('Activities');
    });

    it('should ALLOW deletion if user has NO dependencies', async () => {
        (prisma.report.findFirst as any).mockResolvedValue(null);
        (prisma.activity.findFirst as any).mockResolvedValue(null);
        (prisma.financialTransaction.findFirst as any).mockResolvedValue(null);

        const result = await checkDeletionEligibility('user-1');
        expect(result.canDelete).toBe(true);
    });
});
