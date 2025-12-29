import { prisma } from "@/lib/prisma";
import { User } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import { ensurePOJO } from "@/lib/serialization";

/**
 * Robustly fetches a user profile from Prisma using Kinde user data.
 * Handles ID-based and Email-based lookups for better sync resilience.
 */
export async function getSyncProfile(kindeUser: { id: string, email?: string | null, given_name?: string | null, family_name?: string | null }): Promise<User> {
    // 1. Try look up by Kinde ID
    let profile = await prisma.profile.findUnique({
        where: { id: kindeUser.id },
        include: { site: true, smallGroup: true }
    });

    // 2. Fallback to lookup by email (if ID didn't match yet)
    if (!profile && kindeUser.email) {
        profile = await prisma.profile.findUnique({
            where: { email: kindeUser.email.toLowerCase() },
            include: { site: true, smallGroup: true }
        });

        // Potential Auto-Sync: If found by email but ID is different, update ID?
        // This handles cases where people are pre-registered by email.
        if (profile && profile.id !== kindeUser.id) {
            console.warn(`[AUTH_SERVICE] ID MISMATCH DETECTED for ${kindeUser.email}. Syncing: Prisma(${profile.id}) -> Kinde(${kindeUser.id})`);
            try {
                await prisma.profile.update({
                    where: { id: profile.id },
                    data: { id: kindeUser.id }
                });
                // Fix: Update local profile ID so the returned POJO has the synced ID
                profile.id = kindeUser.id;
            } catch (err) {
                console.error("[AUTH_SERVICE] Failed to auto-sync ID:", err);
            }
        }
    }

    // 3. Map to clean POJO
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
        };
        return ensurePOJO(user);
    }

    console.warn(`[AUTH_SERVICE] NO PROFILE FOUND for ${kindeUser.id} / ${kindeUser.email}. Falling back to default MEMBER role.`);
    const fallbackUser: User = {
        id: kindeUser.id,
        name: `${kindeUser.given_name ?? ''} ${kindeUser.family_name ?? ''}`.trim() || kindeUser.email || 'User',
        email: kindeUser.email || '',
        role: ROLES.MEMBER as any,
        status: 'active'
    };

    return ensurePOJO(fallbackUser);
}
