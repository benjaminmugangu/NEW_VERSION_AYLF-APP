import { describe, it, expect } from 'vitest';
import { buildTransactionWhereClause } from './transactions/shared';
import { ROLES } from '@/lib/constants';

describe('NC Financial Consistency', () => {
    it('should force siteId: null for National Coordinator transactions', () => {
        const mockNC = { id: 'nc-1', role: ROLES.NATIONAL_COORDINATOR } as any;
        const filters = { user: mockNC };
        const where = buildTransactionWhereClause(filters);

        // Ensure that for NC, siteId is explicitly null (National scope)
        expect(where.siteId).toBeNull();
    });

    it('should NOT force siteId: null for Site Coordinator', () => {
        const mockSC = {
            id: 'sc-1',
            role: ROLES.SITE_COORDINATOR,
            siteId: 'site-123'
        } as any;
        const filters = { user: mockSC };
        const where = buildTransactionWhereClause(filters);

        // Should use the SC's siteId
        expect(where.siteId).toBe('site-123');
    });

    it('should NOT force siteId: null for Small Group Leader', () => {
        const mockSGL = {
            id: 'sgl-1',
            role: ROLES.SMALL_GROUP_LEADER,
            smallGroupId: 'group-123',
            siteId: 'site-123'
        } as any;
        const filters = { user: mockSGL };
        const where = buildTransactionWhereClause(filters);

        // SGL should filter by smallGroupId, not siteId=null
        expect(where.smallGroupId).toBe('group-123');
        expect(where.siteId).toBeUndefined();
    });
});
