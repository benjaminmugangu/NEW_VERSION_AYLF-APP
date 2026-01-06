import { basePrisma } from "@/lib/prisma";
import { User } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import { ensurePOJO } from "@/lib/serialization";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

/**
 * Robustly fetches, creates, or synchronizes a user profile using Kinde data.
 * This function uses basePrisma to bypass RLS/transactions during the identity phase,
 * preventing connection pool timeouts and deadlocks.
 */
export async function getSyncProfile(
    kindeUser: { id: string, email?: string | null, given_name?: string | null, family_name?: string | null },
    kindeRoleKey?: string
): Promise<User> {
    const normalizedEmail = kindeUser.email?.toLowerCase();

    // ✨ SUPER-TESTING MODE (ByPass identity in Development)
    if (process.env.NODE_ENV === 'development') {
        const cookieStore = await cookies();
        const mockEmail = cookieStore.get('MOCK_AUTH_EMAIL')?.value;

        if (mockEmail) {
            console.log(`[AUTH_SERVICE] 🧪 Super-Testing Mode: Bypassing to ${mockEmail}`);
            const mockProfile = await basePrisma.profile.findUnique({
                where: { email: mockEmail.toLowerCase() },
                include: { site: true, smallGroup: true }
            });

            if (mockProfile) {
                const mockUser: User = {
                    id: mockProfile.id,
                    name: mockProfile.name,
                    email: mockProfile.email,
                    role: mockProfile.role as any,
                    siteId: mockProfile.siteId,
                    smallGroupId: mockProfile.smallGroupId,
                    status: mockProfile.status as any,
                    siteName: mockProfile.site?.name,
                    smallGroupName: mockProfile.smallGroup?.name,
                    mandateStartDate: mockProfile.mandateStartDate?.toISOString(),
                    mandateEndDate: mockProfile.mandateEndDate?.toISOString(),
                    avatarUrl: mockProfile.avatarUrl || undefined,
                };
                return ensurePOJO(mockUser);
            }
        }
    }

    // 1. Try look up by Kinde ID
    let profile = await basePrisma.profile.findUnique({
        where: { id: kindeUser.id },
        include: { site: true, smallGroup: true }
    });

    // 2. Fallback: Lookup by email (handles pre-registered users)
    if (!profile && normalizedEmail) {
        profile = await basePrisma.profile.findUnique({
            where: { email: normalizedEmail },
            include: { site: true, smallGroup: true }
        });

        // Auto-sync ID if mismatch detected
        if (profile && profile.id !== kindeUser.id) {
            console.warn(`[AUTH_SERVICE] ID MISMATCH for ${normalizedEmail}. Updating: ${profile.id} -> ${kindeUser.id}`);
            try {
                await basePrisma.profile.update({
                    where: { id: profile.id },
                    data: { id: kindeUser.id }
                });
                profile.id = kindeUser.id;
            } catch (err) {
                console.error("[AUTH_SERVICE] Failed to auto-sync ID:", err);
            }
        }
    }

    // 3. Create profile if it doesn't exist (Onboarding)
    if (!profile && normalizedEmail) {
        console.log(`[AUTH_SERVICE] Profile not found, creating for ${normalizedEmail}...`);

        // Check for pending invitation to inherit role/site
        const invitation = await basePrisma.userInvitation.findFirst({
            where: {
                email: { equals: normalizedEmail, mode: 'insensitive' },
                status: "pending"
            },
            orderBy: { createdAt: "desc" }
        });

        const role: UserRole = invitation?.role || "MEMBER";
        const siteId = invitation?.siteId || null;
        const smallGroupId = invitation?.smallGroupId || null;

        try {
            profile = await basePrisma.profile.create({
                data: {
                    id: kindeUser.id,
                    email: normalizedEmail,
                    name: `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email || 'User',
                    role: role,
                    siteId: siteId,
                    smallGroupId: smallGroupId,
                    status: "active",
                },
                include: { site: true, smallGroup: true }
            });

            if (invitation) {
                // ✨ BIDIRECTIONAL LINKING:
                // If the user joined as a SGL and a group was specified, 
                // make sure that group actually lists this user as its leader.
                if (role === 'SMALL_GROUP_LEADER' && smallGroupId) {
                    const group = await basePrisma.smallGroup.findUnique({
                        where: { id: smallGroupId },
                        select: { leaderId: true }
                    });

                    if (group && !group.leaderId) {
                        console.log(`[AUTH_SERVICE] Auto-assigning leader ${profile.id} to group ${smallGroupId}`);
                        await basePrisma.smallGroup.update({
                            where: { id: smallGroupId },
                            data: { leaderId: profile.id }
                        });
                    }
                }

                // ✨ BIDIRECTIONAL LINKING (SC):
                // If the user joined as a Site Coordinator and a site was specified,
                // make sure that site actually lists this user as its coordinator.
                if (role === 'SITE_COORDINATOR' && siteId) {
                    const site = await basePrisma.site.findUnique({
                        where: { id: siteId },
                        select: { coordinatorId: true }
                    });

                    if (site && !site.coordinatorId) {
                        console.log(`[AUTH_SERVICE] Auto-assigning coordinator ${profile.id} to site ${siteId}`);
                        await basePrisma.site.update({
                            where: { id: siteId },
                            data: { coordinatorId: profile.id }
                        });
                    }
                }

                await basePrisma.userInvitation.update({
                    where: { id: invitation.id },
                    data: { status: "accepted" }
                });
            }
        } catch (err) {
            console.error("[AUTH_SERVICE] Failed to create profile:", err);
        }
    }

    // 4. Metadata & Role Refresh (Existing users)
    if (profile) {
        const targetName = `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email || profile.name;
        let targetRole: UserRole = profile.role as UserRole;

        if (kindeRoleKey) {
            const roleMap: Record<string, UserRole> = {
                'national_coordinator': 'NATIONAL_COORDINATOR',
                'site_coordinator': 'SITE_COORDINATOR',
                'small_group_leader': 'SMALL_GROUP_LEADER',
                'member': 'MEMBER'
            };
            const kindeRoleValue = roleMap[kindeRoleKey];

            // Only update role if Kinde has a "significant" role or if DB is 'MEMBER'
            if (kindeRoleValue) {
                if (kindeRoleValue === 'NATIONAL_COORDINATOR' ||
                    (kindeRoleValue !== 'MEMBER' && profile.role === 'MEMBER')) {
                    targetRole = kindeRoleValue;
                }
            }
        }

        if (profile.name !== targetName || profile.role !== targetRole) {
            console.log(`[AUTH_SERVICE] Refreshing metadata for ${profile.email}`);
            profile = await basePrisma.profile.update({
                where: { id: profile.id },
                data: { name: targetName, role: targetRole },
                include: { site: true, smallGroup: true }
            });
        }

        // ✨ CATCH-ALL BIDIRECTIONAL LINKING:
        // Ensure that if this user is a SGL and has a group, that group points back to them.
        if (profile.role === 'SMALL_GROUP_LEADER' && profile.smallGroupId) {
            const group = await basePrisma.smallGroup.findUnique({
                where: { id: profile.smallGroupId },
                select: { leaderId: true }
            });

            if (group && !group.leaderId) {
                console.log(`[AUTH_SERVICE] Retroactively assigning leader ${profile.id} to group ${profile.smallGroupId}`);
                await basePrisma.smallGroup.update({
                    where: { id: profile.smallGroupId },
                    data: { leaderId: profile.id }
                });
            }
        }

        // ✨ CATCH-ALL BIDIRECTIONAL LINKING (SC):
        // Ensure that if this user is a Site Coordinator and has a site, that site points back to them.
        if (profile.role === 'SITE_COORDINATOR' && profile.siteId) {
            const site = await basePrisma.site.findUnique({
                where: { id: profile.siteId },
                select: { coordinatorId: true }
            });

            if (site && !site.coordinatorId) {
                console.log(`[AUTH_SERVICE] Retroactively assigning coordinator ${profile.id} to site ${profile.siteId}`);
                await basePrisma.site.update({
                    where: { id: profile.siteId },
                    data: { coordinatorId: profile.id }
                });
            }
        }
    }

    // 5. Final Mapping to clean POJO
    if (profile) {
        const user: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role as any,
            siteId: profile.siteId,
            smallGroupId: profile.smallGroupId,
            status: profile.status as any,
            siteName: profile.site?.name,
            smallGroupName: profile.smallGroup?.name,
            mandateStartDate: profile.mandateStartDate?.toISOString(),
            mandateEndDate: profile.mandateEndDate?.toISOString(),
            avatarUrl: profile.avatarUrl || undefined,
        };
        return ensurePOJO(user);
    }

    // Fallback for extreme cases (missing from DB and creation failed)
    const fallback: User = {
        id: kindeUser.id,
        name: `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email || 'User',
        email: kindeUser.email || '',
        role: ROLES.MEMBER as any,
        status: 'active'
    };
    return ensurePOJO(fallback);
}
