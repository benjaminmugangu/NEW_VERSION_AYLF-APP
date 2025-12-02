'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";
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

        // Verify email match (optional, but good for security)
        // If the user signed up with a different email than the invitation, 
        // we might want to allow it IF they have the token, OR enforce email match.
        // For now, let's enforce email match to prevent token stealing, 
        // UNLESS we decide that the token ownership is enough proof.
        // Given the user feedback "redirection doesn't work", they might be using different emails?
        // No, usually it's the same. Let's stick to the token validity.
        // BUT, if we enforce email match, we must be sure Kinde email matches invitation email.

        if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
            // Warning: Email mismatch. 
            // We can either block it or allow it and update the invitation email.
            // Let's block for security for now, unless user complains.
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

        // Clear the cookie if it exists (client side should do it, but we can try setting it to expire)
        (await cookies()).delete('invitation_token');

        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error("Error processing invitation:", error);
        return { success: false, error: "Internal server error" };
    }
}
