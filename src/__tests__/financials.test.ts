
import { describe, it, expect, vi } from 'vitest';
import { getFinancials, getEntityFinancials } from '@/services/financialsService';

// Mock dependencies
vi.mock('@/services/transactionService', () => ({
    getFilteredTransactions: vi.fn(),
}));
vi.mock('@/services/allocations.service', () => ({
    getAllocations: vi.fn(),
}));
vi.mock('@/services/reportService', () => ({
    getFilteredReports: vi.fn(),
}));

import * as transactionService from '@/services/transactionService';
import * as allocationService from '@/services/allocations.service';
import * as reportService from '@/services/reportService';

describe('Financial Logic', () => {
    it('should correctly calculate Net Balance (Income - Expenses)', async () => {
        // Setup: Mock Data
        const mockTransactions = [
            { id: '1', type: 'income', amount: 1000, date: '2023-01-01' },
            { id: '2', type: 'expense', amount: 400, date: '2023-01-02' },
            { id: '3', type: 'expense', amount: 100, date: '2023-01-03' },
        ];

        (transactionService.getFilteredTransactions as any).mockResolvedValue(mockTransactions);
        (allocationService.getAllocations as any).mockResolvedValue([]);
        (reportService.getFilteredReports as any).mockResolvedValue([]);

        const user = { id: 'u1', role: 'NATIONAL_COORDINATOR' } as any;
        const dateFilter = { rangeKey: 'all_time' as const, display: 'All Time' };
        const result = await getFinancials(user, dateFilter);

        expect(result.income).toBe(1000);
        expect(result.expenses).toBe(500); // 400 + 100
        expect(result.netBalance).toBe(500); // 1000 - 500
    });

    it('should filter financials by Entity (Site)', async () => {
        const mockSiteTransactions = [
            { id: '1', type: 'income', amount: 500, date: '2023-01-01', siteId: 'site-1' },
        ];

        (transactionService.getFilteredTransactions as any).mockResolvedValue(mockSiteTransactions);
        (allocationService.getAllocations as any).mockResolvedValue([]);

        const entity = { type: 'site' as const, id: 'site-1' };
        const dateFilter = { rangeKey: 'all_time' as const, display: 'All Time' };
        const result = await getEntityFinancials(entity, dateFilter);

        // Verify logic calls correct filters (checked via mock spy if needed, but here checking calculation)
        expect(result.income).toBe(500);
        expect(result.expenses).toBe(0);
        expect(result.netBalance).toBe(500);
    });
});
