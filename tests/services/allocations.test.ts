// Tests for Hybrid Fund Allocation System
// Covers all scenarios: NC hierarchical, NC direct, SC hierarchical, and error cases

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAllocation, updateAllocation, deleteAllocation, getAllocations, getAllocationById } from '@/services/allocations.service';
import type { FundAllocationFormData } from '@/lib/types';

// Create shared mock instances BEFORE mocks to ensure same instance is used everywhere
// Use vi.hoisted to ensure these are available when vi.mock calls are hoisted
const { mockGetUser, mockKindeSession, mockPrisma } = vi.hoisted(() => {
    const getUser = vi.fn();
    return {
        mockGetUser: getUser,
        mockKindeSession: {
            getUser: getUser,
        },
        mockPrisma: {
            profile: {
                findUnique: vi.fn(),
            },
            fundAllocation: {
                create: vi.fn(),
                update: vi.fn(),
                delete: vi.fn(),
                findUnique: vi.fn(),
                findMany: vi.fn(),
            },
            smallGroup: {
                findUnique: vi.fn(),
            },
        }
    };
});

// Mock Prisma - return mockPrisma instance
vi.mock('@/lib/prisma', () => ({
    prisma: mockPrisma,
    withRLS: vi.fn((userId: string, callback: () => any) => callback()), // Execute callback immediately
}));

// Mock Kinde Auth - return shared session instance
vi.mock('@kinde-oss/kinde-auth-nextjs/server', () => ({
    getKindeServerSession: vi.fn(() => mockKindeSession), // Always return same instance
}));

// Mock budget service
vi.mock('@/services/budgetService', () => ({
    calculateAvailableBudget: vi.fn(() => Promise.resolve({ available: 100000 })),
}));

describe('Hybrid Fund Allocation System', () => {
    const mockNCUser = {
        id: 'nc-user-123',
        email: 'nc@aylf.org',
        given_name: 'National',
        family_name: 'Coordinator',
        picture: null,
    };

    const mockSCUser = {
        id: 'sc-user-456',
        email: 'sc@aylf.org',
        given_name: 'Site',
        family_name: 'Coordinator',
        picture: null,
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
            // Arrange - use shared mock instances directly
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);
            mockPrisma.fundAllocation.create.mockResolvedValue(mockAllocationCreated as any);
            mockPrisma.fundAllocation.findUnique.mockResolvedValue({
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
            expect(mockPrisma.fundAllocation.create).toHaveBeenCalledWith(
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
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);

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
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);

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
            mockGetUser.mockResolvedValue(mockNCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);
            mockPrisma.smallGroup.findUnique.mockResolvedValue(mockSmallGroup as any);

            const directAllocation = {
                ...mockAllocationCreated,
                allocationType: 'direct',
                bypassReason: 'Urgence - Activité communautaire imprévue nécessitant financement immédiat',
                smallGroupId: 'group-alpha',
            };
            mockPrisma.fundAllocation.create.mockResolvedValue(directAllocation as any);
            mockPrisma.fundAllocation.findUnique.mockResolvedValue({
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
            expect(mockPrisma.fundAllocation.create).toHaveBeenCalledWith(
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
            mockGetUser.mockResolvedValue(mockNCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);

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
            mockGetUser.mockResolvedValue(mockNCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);

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
            mockGetUser.mockResolvedValue(mockNCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);

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
            mockGetUser.mockResolvedValue(mockSCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(mockSCProfile as any);
            mockPrisma.smallGroup.findUnique.mockResolvedValue(mockSmallGroup as any);

            const scAllocation = {
                ...mockAllocationCreated,
                allocatedById: 'sc-user-456',
                smallGroupId: 'group-alpha',
            };
            mockPrisma.fundAllocation.create.mockResolvedValue(scAllocation as any);
            mockPrisma.fundAllocation.findUnique.mockResolvedValue({
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
            expect(mockPrisma.fundAllocation.create).toHaveBeenCalledWith(
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
            mockGetUser.mockResolvedValue(mockSCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(mockSCProfile as any);

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
            mockGetUser.mockResolvedValue(mockSCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(mockSCProfile as any);

            const otherSiteGroup = {
                id: 'group-beta',
                name: 'Beta Group',
                siteId: 'site-goma', // Different site
            };
            mockPrisma.smallGroup.findUnique.mockResolvedValue(otherSiteGroup as any);

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
            mockGetUser.mockResolvedValue(mockSCUser);

            mockPrisma.profile.findUnique.mockResolvedValue({
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
            mockGetUser.mockResolvedValue(null); // No user

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
            mockGetUser.mockResolvedValue(mockNCUser);

            mockPrisma.profile.findUnique.mockResolvedValue(null); // No profile

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
            mockGetUser.mockResolvedValue({ id: 'sgl-user', email: 'sgl@aylf.org', given_name: 'SGL', family_name: 'User', picture: null });

            mockPrisma.profile.findUnique.mockResolvedValue({
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

    // ═══════════════════════════════════════════════════════════
    // UPDATE & DELETE OPERATIONS
    // ═══════════════════════════════════════════════════════════

    describe('Update & Delete Operations', () => {
        const mockID = 'allocation-123';

        it('should allow National Coordinator to update allocation', async () => {
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);
            mockPrisma.fundAllocation.findUnique.mockResolvedValue(mockAllocationCreated as any);

            const updateData = { amount: 6000 };
            const result = await updateAllocation(mockID, updateData);

            expect(result).toBeDefined();
            expect(mockPrisma.profile.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: mockNCUser.id } })
            );
        });

        it('should reject Site Coordinator from updating allocation', async () => {
            mockGetUser.mockResolvedValue(mockSCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockSCProfile as any);

            await expect(updateAllocation(mockID, { amount: 6000 })).rejects.toThrow(
                'Only National Coordinators can update allocations'
            );
        });

        it('should allow National Coordinator to delete allocation', async () => {
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);

            await deleteAllocation(mockID);

            expect(mockPrisma.fundAllocation.delete).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: mockID } })
            );
        });

        it('should reject Site Coordinator from deleting allocation', async () => {
            mockGetUser.mockResolvedValue(mockSCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockSCProfile as any);

            await expect(deleteAllocation(mockID)).rejects.toThrow(
                'Only National Coordinators can delete allocations'
            );
        });

        it('should reject changing allocationType after creation', async () => {
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);

            await expect(updateAllocation(mockID, { allocationType: 'direct' } as any)).rejects.toThrow(
                'Audit Integrity Error: Cannot change allocationType'
            );
        });

        it('should enforce 20 chars bypassReason when updating direct allocation', async () => {
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.profile.findUnique.mockResolvedValue(mockNCProfile as any);
            mockPrisma.fundAllocation.findUnique.mockResolvedValue({ ...mockAllocationCreated, allocationType: 'direct' } as any);

            await expect(updateAllocation(mockID, { bypassReason: 'Too short' })).rejects.toThrow(
                'minimum 20 characters'
            );
        });
    });

    // ═══════════════════════════════════════════════════════════
    // READ OPERATIONS WITH RLS
    // ═══════════════════════════════════════════════════════════

    describe('Read Operations with RLS Context', () => {
        it('should list allocations within RLS context', async () => {
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.fundAllocation.findMany.mockResolvedValue([mockAllocationCreated] as any);

            const result = await getAllocations();

            expect(result).toHaveLength(1);
            expect(mockPrisma.fundAllocation.findMany).toHaveBeenCalled();
        });

        it('should get single allocation within RLS context', async () => {
            mockGetUser.mockResolvedValue(mockNCUser);
            mockPrisma.fundAllocation.findUnique.mockResolvedValue(mockAllocationCreated as any);

            const result = await getAllocationById('allocation-123');

            expect(result).toBeDefined();
            expect(result.id).toBe('allocation-123');
        });

        it('should reject unauthenticated read access for single allocation', async () => {
            mockGetUser.mockResolvedValue(null);

            await expect(getAllocationById('allocation-123')).rejects.toThrow(
                'Unauthorized'
            );
        });
    });
});
