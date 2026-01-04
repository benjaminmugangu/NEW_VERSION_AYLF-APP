import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import notificationService from './notificationService';
import { ROLES } from '@/lib/constants';

export interface CreateInvitationData {
    email: string;
    role: UserRole;
    siteId?: string;
    smallGroupId?: string;
    mandateStartDate?: Date;
    mandateEndDate?: Date;
}

export async function createInvitation(data: CreateInvitationData) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const existingInvitation = await prisma.userInvitation.findUnique({
        where: { email: data.email },
    });

    // ✅ Apply Exclusivity Guards based on Role
    let siteId = data.siteId;
    let smallGroupId = data.smallGroupId;

    if (data.role === 'NATIONAL_COORDINATOR') {
        siteId = undefined;
        smallGroupId = undefined;
    } else if (data.role === 'SITE_COORDINATOR') {
        smallGroupId = undefined;
    } else if ((data.role === 'SMALL_GROUP_LEADER' || data.role === 'MEMBER') && smallGroupId && !siteId) {
        // ✨ Auto-linking: If group is selected but site isn't, use the group's site
        const group = await prisma.smallGroup.findUnique({
            where: { id: smallGroupId },
            select: { siteId: true }
        });
        if (group) siteId = group.siteId;
    }

    return await prisma.$transaction(async (tx: any) => {
        let invitation;
        if (existingInvitation) {
            // ✅ FIX INV-004: Regenerate token on update (security)
            invitation = await tx.userInvitation.update({
                where: { email: data.email },
                data: {
                    token: randomUUID(), // ✅ New token (prevents old token reuse)
                    role: data.role,
                    siteId: siteId,
                    smallGroupId: smallGroupId,
                    mandateStartDate: data.mandateStartDate, // ✅ Save mandate dates
                    mandateEndDate: data.mandateEndDate,
                    status: 'pending',
                    expiresAt, // ✅ Reset expiration
                },
            });
        } else {
            // ✅ FIX INV-002: Explicit token generation with crypto.randomUUID()
            invitation = await tx.userInvitation.create({
                data: {
                    email: data.email,
                    token: randomUUID(), // ✅ Cryptographically secure UUIDv4
                    role: data.role,
                    siteId: siteId,
                    smallGroupId: smallGroupId,
                    mandateStartDate: data.mandateStartDate, // ✅ Save mandate dates
                    mandateEndDate: data.mandateEndDate,
                    expiresAt, // ✅ FIX INV-003: 7-day expiration
                },
            });
        }

        // Notify National Coordinators (Reviewers)
        const nationalCoordinators = await tx.profile.findMany({
            where: { role: ROLES.NATIONAL_COORDINATOR }
        });

        for (const nc of nationalCoordinators) {
            await notificationService.createNotification({
                userId: nc.id,
                type: 'USER_INVITED',
                title: '👤 Nouvelle Invitation Envoyée',
                message: `Une invitation pour le rôle ${data.role} a été envoyée à ${data.email}.`,
                link: '/dashboard/admin/invitations', // Assuming this path exists for managing invitations
            }, tx).catch(err => console.error(`Failed to notify NC ${nc.id}:`, err));
        }

        return invitation;
    });
}

export async function getInvitationByEmail(email: string) {
    return await prisma.userInvitation.findUnique({
        where: { email },
    });
}

export async function getInvitationByToken(token: string) {
    const invitation = await prisma.userInvitation.findUnique({
        where: { token },
        include: {
            site: true,
            smallGroup: true
        }
    });

    // ✅ FIX INV-003: Validate expiration
    if (invitation && invitation.expiresAt < new Date()) {
        // Mark as expired
        await prisma.userInvitation.update({
            where: { id: invitation.id },
            data: { status: 'expired' },
        });
        return null; // Treat as not found
    }

    return invitation;
}

export async function acceptInvitation(email: string) {
    return await prisma.userInvitation.update({
        where: { email },
        data: { status: 'accepted' },
    });
}

export async function deleteInvitation(email: string) {
    return await prisma.userInvitation.delete({
        where: { email },
    });
}
