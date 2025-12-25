// Tests for Hybrid Fund Allocation System
// Covers all scenarios: NC hierarchical, NC direct, SC hierarchical, and error cases

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAllocation } from '@/services/allocations.service';
import type { FundAllocationFormData } from '@/lib/types';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        profile: {
            findUnique: vi.fn(),
        },
        fundAllocation: {
            create: vi.fn(),
            findUnique: vi.fn(),
        },
        smallGroup: {
            findUnique: vi.fn(),
        },
    },
    withRLS: vi.fn((userId, callback) => callback()),
}));

// Mock Kinde Auth
vi.mock('@kinde-oss/kinde-auth-nextjs/server', () => ({
    getKindeServerSession: vi.fn(() => ({
        getUser: vi.fn(),
    })),
}));

// Mock budget service
vi.mock('@/services/budgetService', () => ({
    calculateAvailableBudget: vi.fn(() => Promise.resolve({ available: 100000 })),
}));

describe('Hybrid Fund Allocation System', () => {
    const mockNCUser = {
        id: 'nc-user-123',
        email: 'nc@aylf.org',
    };

    const mockSCUser = {
        id: 'sc-user-456',
        email: 'sc@aylf.org',
    };

    const mockNCProfile = {
        id: 'nc-user-123',
        role: 'NATIONAL_COORDINATOR',
        siteId: null,
        name: 'National Coordinator',
    };

    const mockSCProfile = {
        id: 'sc-user-456',
        role: 'SITE_COORDINATOR',
        siteId: 'site-kinshasa',
        name: 'Site Coordinator Kinshasa',
    };

    const mockSite = {
        id: 'site-kinshasa',
        name: 'Kinshasa',
    };

    const mockSmallGroup = {
        id: 'group-alpha',
        name: 'Alpha Group',
        siteId: 'site-kinshasa',
        site: mockSite,
    };

    const mockAllocationCreated = {
        id: 'allocation-123',
        amount: 5000,
        allocationDate: new Date(),
        goal: 'Test allocation',
        source: 'national_funds',
        status: 'completed',
        allocationType: 'hierarchical',
        bypassReason: null,
        siteId: 'site-kinshasa',
        smallGroupId: null,
        allocatedById: 'nc-user-123',
        allocatedBy: { name: 'National Coordinator' },
        site: mockSite,
        smallGroup: null,
        fromSite: null,
        fromSiteId: null,
        notes: null,
        proofUrl: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ═══════════════════════════════════════════════════════════
    // NATIONAL COORDINATOR - HIERARCHICAL ALLOCATIONS
    // ═══════════════════════════════════════════════════════════

    describe('NC - Hierarchical Allocation (NC → Site)', () => {
        it('should create hierarchical allocation to Site successfully', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockNCProfile as any);
            vi.mocked(prisma.fundAllocation.create).mockResolvedValue(mockAllocationCreated as any);
            vi.mocked(prisma.fundAllocation.findUnique).mockResolvedValue({
                ...mockAllocationCreated,
                allocatedBy: { name: 'National Coordinator' },
                site: mockSite,
                smallGroup: null,
                fromSite: null,
            } as any);

            const formData: FundAllocationFormData = {
                amount: 5000,
                allocationDate: new Date().toISOString(),
                goal: 'Q1 Budget',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                siteId: 'site-kinshasa',
                smallGroupId: undefined,
                isDirect: false,
                bypassReason: undefined,
            };

            // Act
            const result = await createAllocation(formData);

            // Assert
            expect(result).toBeDefined();
            expect(result.allocationType).toBe('hierarchical');
            expect(result.siteId).toBe('site-kinshasa');
            expect(result.smallGroupId).toBeUndefined();
            expect(result.bypassReason).toBeUndefined();
            expect(prisma.fundAllocation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        allocationType: 'hierarchical',
                        siteId: 'site-kinshasa',
                        smallGroupId: null,
                        bypassReason: null,
                    }),
                })
            );
        });

        it('should reject hierarchical NC allocation without siteId', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockNCProfile as any);

            const formData: FundAllocationFormData = {
                amount: 5000,
                allocationDate: new Date().toISOString(),
                goal: 'Q1 Budget',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                siteId: undefined, // Missing siteId
                isDirect: false,
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow('Hierarchical allocation requires a target Site');
        });

        it('should reject hierarchical NC allocation with smallGroupId', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockNCProfile as any);

            const formData: FundAllocationFormData = {
                amount: 5000,
                allocationDate: new Date().toISOString(),
                goal: 'Q1 Budget',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                siteId: 'site-kinshasa',
                smallGroupId: 'group-alpha', // Should not be provided in hierarchical mode
                isDirect: false,
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'Hierarchical NC allocation must target a Site ONLY'
            );
        });
    });

    // ═══════════════════════════════════════════════════════════
    // NATIONAL COORDINATOR - DIRECT ALLOCATIONS
    // ═══════════════════════════════════════════════════════════

    describe('NC - Direct Allocation (NC → Small Group)', () => {
        it('should create direct allocation to Small Group with valid justification', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockNCProfile as any);
            vi.mocked(prisma.smallGroup.findUnique).mockResolvedValue(mockSmallGroup as any);

            const directAllocation = {
                ...mockAllocationCreated,
                allocationType: 'direct',
                bypassReason: 'Urgence - Activité communautaire imprévue nécessitant financement immédiat',
                smallGroupId: 'group-alpha',
            };
            vi.mocked(prisma.fundAllocation.create).mockResolvedValue(directAllocation as any);
            vi.mocked(prisma.fundAllocation.findUnique).mockResolvedValue({
                ...directAllocation,
                allocatedBy: { name: 'National Coordinator' },
                site: mockSite,
                smallGroup: mockSmallGroup,
                fromSite: null,
            } as any);

            const formData: FundAllocationFormData = {
                amount: 3500,
                allocationDate: new Date().toISOString(),
                goal: 'Emergency funding',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                smallGroupId: 'group-alpha',
                isDirect: true,
                bypassReason: 'Urgence - Activité communautaire imprévue nécessitant financement immédiat',
            };

            // Act
            const result = await createAllocation(formData);

            // Assert
            expect(result).toBeDefined();
            expect(result.allocationType).toBe('direct');
            expect(result.smallGroupId).toBe('group-alpha');
            expect(result.bypassReason).toBe('Urgence - Activité communautaire imprévue nécessitant financement immédiat');
            expect(prisma.fundAllocation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        allocationType: 'direct',
                        smallGroupId: 'group-alpha',
                        bypassReason: formData.bypassReason,
                    }),
                })
            );
        });

        it('should reject direct allocation without bypassReason', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockNCProfile as any);

            const formData: FundAllocationFormData = {
                amount: 3500,
                allocationDate: new Date().toISOString(),
                goal: 'Emergency funding',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                smallGroupId: 'group-alpha',
                isDirect: true,
                bypassReason: undefined, // Missing justification
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'Direct allocations require a detailed justification'
            );
        });

        it('should reject direct allocation with short bypassReason (<20 chars)', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockNCProfile as any);

            const formData: FundAllocationFormData = {
                amount: 3500,
                allocationDate: new Date().toISOString(),
                goal: 'Emergency funding',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                smallGroupId: 'group-alpha',
                isDirect: true,
                bypassReason: 'Too short', // Only 9 characters
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'minimum 20 characters'
            );
        });

        it('should reject direct allocation without smallGroupId', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockNCProfile as any);

            const formData: FundAllocationFormData = {
                amount: 3500,
                allocationDate: new Date().toISOString(),
                goal: 'Emergency funding',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                smallGroupId: undefined, // Missing target
                isDirect: true,
                bypassReason: 'Valid justification with more than twenty characters',
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'Direct allocation requires a target Small Group'
            );
        });
    });

    // ═══════════════════════════════════════════════════════════
    // SITE COORDINATOR - HIERARCHICAL ALLOCATIONS
    // ═══════════════════════════════════════════════════════════

    describe('SC - Hierarchical Allocation (SC → Small Group)', () => {
        it('should create hierarchical allocation to Small Group within site', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockSCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockSCProfile as any);
            vi.mocked(prisma.smallGroup.findUnique).mockResolvedValue(mockSmallGroup as any);

            const scAllocation = {
                ...mockAllocationCreated,
                allocatedById: 'sc-user-456',
                smallGroupId: 'group-alpha',
            };
            vi.mocked(prisma.fundAllocation.create).mockResolvedValue(scAllocation as any);
            vi.mocked(prisma.fundAllocation.findUnique).mockResolvedValue({
                ...scAllocation,
                allocatedBy: { name: 'Site Coordinator Kinshasa' },
                site: mockSite,
                smallGroup: mockSmallGroup,
                fromSite: mockSite,
            } as any);

            const formData: FundAllocationFormData = {
                amount: 2000,
                allocationDate: new Date().toISOString(),
                goal: 'Youth program',
                source: 'site_funds_site-kinshasa',
                status: 'completed',
                allocatedById: 'sc-user-456',
                smallGroupId: 'group-alpha',
                fromSiteId: 'site-kinshasa',
            };

            // Act
            const result = await createAllocation(formData);

            // Assert
            expect(result).toBeDefined();
            expect(result.allocationType).toBe('hierarchical');
            expect(result.smallGroupId).toBe('group-alpha');
            expect(result.siteId).toBe('site-kinshasa');
            expect(result.bypassReason).toBeUndefined();
            expect(prisma.fundAllocation.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        allocationType: 'hierarchical',
                        smallGroupId: 'group-alpha',
                        siteId: 'site-kinshasa',
                        bypassReason: null,
                    }),
                })
            );
        });

        it('should reject SC allocation without smallGroupId', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockSCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockSCProfile as any);

            const formData: FundAllocationFormData = {
                amount: 2000,
                allocationDate: new Date().toISOString(),
                goal: 'Youth program',
                source: 'site_funds_site-kinshasa',
                status: 'completed',
                allocatedById: 'sc-user-456',
                smallGroupId: undefined, // Missing target
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'Site Coordinator must allocate to a Small Group'
            );
        });

        it('should reject SC allocation to Small Group from another site', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockSCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockSCProfile as any);

            const otherSiteGroup = {
                id: 'group-beta',
                name: 'Beta Group',
                siteId: 'site-goma', // Different site
            };
            vi.mocked(prisma.smallGroup.findUnique).mockResolvedValue(otherSiteGroup as any);

            const formData: FundAllocationFormData = {
                amount: 2000,
                allocationDate: new Date().toISOString(),
                goal: 'Youth program',
                source: 'site_funds_site-kinshasa',
                status: 'completed',
                allocatedById: 'sc-user-456',
                smallGroupId: 'group-beta', // From another site
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'Cannot allocate to Small Group from another site'
            );
        });

        it('should reject SC without assigned site', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockSCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue({
                ...mockSCProfile,
                siteId: null, // No assigned site
            } as any);

            const formData: FundAllocationFormData = {
                amount: 2000,
                allocationDate: new Date().toISOString(),
                goal: 'Youth program',
                source: 'site_funds',
                status: 'completed',
                allocatedById: 'sc-user-456',
                smallGroupId: 'group-alpha',
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'Site Coordinator has no assigned site'
            );
        });
    });

    // ═══════════════════════════════════════════════════════════
    // AUTHENTICATION & AUTHORIZATION
    // ═══════════════════════════════════════════════════════════

    describe('Authentication & Authorization', () => {
        it('should reject unauthenticated requests', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(null); // No user

            const formData: FundAllocationFormData = {
                amount: 5000,
                allocationDate: new Date().toISOString(),
                goal: 'Test',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                siteId: 'site-kinshasa',
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow('Unauthorized');
        });

        it('should reject users without profile', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue(mockNCUser);

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue(null); // No profile

            const formData: FundAllocationFormData = {
                amount: 5000,
                allocationDate: new Date().toISOString(),
                goal: 'Test',
                source: 'national_funds',
                status: 'completed',
                allocatedById: 'nc-user-123',
                siteId: 'site-kinshasa',
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow('Profile not found');
        });

        it('should reject unauthorized roles (e.g., SMALL_GROUP_LEADER)', async () => {
            // Arrange
            const { getKindeServerSession } = await import('@kinde-oss/kinde-auth-nextjs/server');
            const { getUser } = getKindeServerSession();
            vi.mocked(getUser).mockResolvedValue({ id: 'sgl-user', email: 'sgl@aylf.org' });

            const { prisma } = await import('@/lib/prisma');
            vi.mocked(prisma.profile.findUnique).mockResolvedValue({
                id: 'sgl-user',
                role: 'SMALL_GROUP_LEADER',
                siteId: 'site-kinshasa',
                smallGroupId: 'group-alpha',
                name: 'SGL User',
            } as any);

            const formData: FundAllocationFormData = {
                amount: 1000,
                allocationDate: new Date().toISOString(),
                goal: 'Test',
                source: 'group_funds',
                status: 'completed',
                allocatedById: 'sgl-user',
                smallGroupId: 'group-alpha',
            };

            // Act & Assert
            await expect(createAllocation(formData)).rejects.toThrow(
                'Only National Coordinators and Site Coordinators can create fund allocations'
            );
        });
    });
});
