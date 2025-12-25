'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma, withRLS } from "@/lib/prisma";
import { getInvitationByToken, acceptInvitation } from "@/services/invitationService";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function processInvitation(token?: string) {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();

        if (!user || !user.email) {
            return { success: false, error: "User not authenticated" };
        }

        return await withRLS(user.id, async () => {
            let invitationToken = token;
            if (!invitationToken) {
                const cookieStore = await cookies();
                invitationToken = cookieStore.get('invitation_token')?.value;
            }

            if (!invitationToken) {
                return { success: false, error: "No invitation token found" };
            }

            const invitation = await getInvitationByToken(invitationToken);

            if (!invitation) {
                return { success: false, error: "Invitation not found" };
            }

            if (invitation.status === 'accepted') {
                return { success: false, error: "Invitation already accepted" };
            }

            if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
                return { success: false, error: "Invitation email does not match logged in user" };
            }

            // Update User Profile with Invitation Data
            await prisma.profile.update({
                where: { id: user.id },
                data: {
                    role: invitation.role,
                    siteId: invitation.siteId,
                    smallGroupId: invitation.smallGroupId,
                },
            });

            // Mark invitation as accepted
            await acceptInvitation(invitation.email);

            // Clear the cookie if it exists
            (await cookies()).delete('invitation_token');

            revalidatePath('/dashboard');
            return { success: true };
        });
    } catch (error) {
        // ✅ SECURITY: Don't log error object (may contain tokens/emails)
        console.error('[PROCESS_INVITATION_ERROR]', {
            type: error?.constructor?.name
        });
        return { success: false, error: "Internal server error" };
    }
}
