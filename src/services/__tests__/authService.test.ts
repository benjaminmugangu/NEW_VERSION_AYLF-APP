import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSyncProfile } from '../authService';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        profile: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

describe('authService: getSyncProfile Hardening', () => {
    const mockKindeUser = {
        id: 'kinde_123',
        email: 'test@example.com',
        given_name: 'Test',
        family_name: 'User'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should sync ID when found by email but ID is different', async () => {
        // First call: Profile exists by email, but with different ID
        const existingProfile = {
            id: 'old_prisma_id',
            email: 'test@example.com',
            name: 'Test User',
            role: 'MEMBER',
            status: 'active'
        };

        (prisma.profile.findUnique as any)
            .mockResolvedValueOnce(null) // ID lookup fails
            .mockResolvedValueOnce(existingProfile); // Email lookup succeeds

        (prisma.profile.update as any).mockResolvedValue({ ...existingProfile, id: 'kinde_123' });

        const result = await getSyncProfile(mockKindeUser);

        expect(prisma.profile.update).toHaveBeenCalledTimes(1);
        expect(prisma.profile.update).toHaveBeenCalledWith({
            where: { id: 'old_prisma_id' },
            data: { id: 'kinde_123' }
        });
        expect(result.id).toBe('kinde_123');
    });

    it('should be idempotent and NOT call update if already synced', async () => {
        const syncedProfile = {
            id: 'kinde_123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'MEMBER',
            status: 'active'
        };

        (prisma.profile.findUnique as any).mockResolvedValue(syncedProfile);

        await getSyncProfile(mockKindeUser);
        await getSyncProfile(mockKindeUser); // Repeat call

        expect(prisma.profile.update).toHaveBeenCalledTimes(0);
    });

    it('should fallback to MEMBER role if no profile exists', async () => {
        (prisma.profile.findUnique as any).mockResolvedValue(null);

        const result = await getSyncProfile(mockKindeUser);

        expect(result.role).toBe('MEMBER');
        expect(result.id).toBe('kinde_123');
        expect(prisma.profile.update).not.toHaveBeenCalled();
    });
});
