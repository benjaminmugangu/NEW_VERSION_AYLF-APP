"use server";

import { prisma, basePrisma, withRLS } from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { revalidatePath } from "next/cache";

export async function getIdentityReport() {
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser) return { error: "Not authenticated with Kinde" };

    return await withRLS(kindeUser.id, async () => {
        // 1. Prisma Check
        const profileById = await prisma.profile.findUnique({ where: { id: kindeUser.id } });
        const profileByEmail = kindeUser.email ? await prisma.profile.findUnique({ where: { email: kindeUser.email.toLowerCase() } }) : null;

        // 2. Direct SQL Check (bypass Prisma RLS extension)
        const sqlStatus = await basePrisma.$queryRawUnsafe(`
      SELECT 
        current_setting('app.current_user_id', true) as session_id,
        (SELECT id FROM public.profiles WHERE email = $1 LIMIT 1) as db_profile_id,
        (SELECT role FROM public.profiles WHERE email = $1 LIMIT 1) as db_profile_role
    `, kindeUser.email?.toLowerCase());

        return {
            kinde: {
                id: kindeUser.id,
                email: kindeUser.email,
                name: `${kindeUser.given_name} ${kindeUser.family_name}`
            },
            prisma: {
                foundById: !!profileById,
                foundByEmail: !!profileByEmail,
                activeProfileId: profileByEmail?.id
            },
            sql: sqlStatus[0]
        };
    });
}

export async function syncIdentity() {
    const { getUser } = getKindeServerSession();
    const kindeUser = await getUser();

    if (!kindeUser || !kindeUser.email) throw new Error("Unauthorized");

    const email = kindeUser.email.toLowerCase();

    // IMPORTANT: Use basePrisma to bypass RLS for the fix
    return await basePrisma.$transaction(async (tx: any) => {
        const profile = await tx.profile.findUnique({
            where: { email },
            include: { site: true, smallGroup: true }
        });

        if (!profile) {
            console.error(`[MAINTENANCE] Sync failed: No profile found for ${email}`);
            throw new Error("Profile not found in database. Please ensure the user has been invited first.");
        }

        const oldId = profile.id;
        const newId = kindeUser.id;

        if (oldId === newId) {
            return { success: true, message: "Your identity is already correctly synchronized." };
        }

        console.log(`[MAINTENANCE] MASTER SYNC START for ${email}: ${oldId} -> ${newId}`);

        try {
            // We use raw SQL because Prisma doesn't always handle PK updates gracefully across relations
            // especially if CASCADE isn't explicitly defined in Prisma schema (it's defined in DB)
            await tx.$executeRawUnsafe(`UPDATE public.profiles SET id = $1 WHERE id = $2`, newId, oldId);

            // Verify the update
            const updatedProfile = await tx.profile.findUnique({ where: { id: newId } });
            if (!updatedProfile) throw new Error("Verification failed: profile not found after ID update.");

            console.log(`[MAINTENANCE] MASTER SYNC SUCCESS for ${email}. Role: ${updatedProfile.role}`);

            revalidatePath('/', 'layout'); // Revalidate everything

            return {
                success: true,
                message: `Identity successfully re-anchored. Your role (${updatedProfile.role}) and data have been preserved.`,
                syncedId: newId
            };
        } catch (e: any) {
            console.error("[MAINTENANCE] CRITICAL SYNC FAILURE:", e);
            throw new Error(`Critical error during identity re-anchoring: ${e.message}. Please contact support.`);
        }
    }, {
        timeout: 20000 // Ensure transaction doesn't time out during cascade
    });
}
