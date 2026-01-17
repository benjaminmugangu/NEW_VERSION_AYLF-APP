import { describe, it, expect } from 'vitest';
import { buildActivityWhereClause } from './activityUtils';

describe('Activity Isolation & Timing Logic', () => {
    const mockUser = { id: 'user-123', role: 'SITE_COORDINATOR', siteId: 'site-456' };

    it('should NOT apply isolation if isReportingContext is false', () => {
        const filters = { user: mockUser, isReportingContext: false };
        const where = buildActivityWhereClause(filters);
        expect(where.createdById).toBeUndefined();
    });

    it('should apply isolation (createdById) if isReportingContext is true', () => {
        const filters = { user: mockUser, isReportingContext: true };
        const where = buildActivityWhereClause(filters);
        expect(where.createdById).toBe(mockUser.id);
    });

    it('should apply 5-hour delay in reporting context', () => {
        const filters = { user: mockUser, isReportingContext: true };
        const where = buildActivityWhereClause(filters);

        expect(where.date).toBeDefined();
        expect(where.date.lte).toBeInstanceOf(Date);

        const now = new Date();
        const cutoff = where.date.lte as Date;
        const diffHours = (now.getTime() - cutoff.getTime()) / (1000 * 60 * 60);

        // Should be approximately 5 hours difference
        expect(diffHours).toBeGreaterThan(4.9);
        expect(diffHours).toBeLessThan(5.1);
    });

    it('should combine cutsom date filters with timing delay', () => {
        const customToDate = new Date();
        customToDate.setFullYear(now().getFullYear() + 1); // Way in future

        const filters = {
            user: mockUser,
            isReportingContext: true,
            dateFilter: { to: customToDate.toISOString() }
        };
        const where = buildActivityWhereClause(filters);

        const nowVal = new Date();
        const cutoff = where.date.lte as Date;
        const diffHours = (nowVal.getTime() - cutoff.getTime()) / (1000 * 60 * 60);

        // Should STILL be 5 hours because timing delay is stricter than future date
        expect(diffHours).toBeGreaterThan(4.9);
    });
});

function now() { return new Date(); }
