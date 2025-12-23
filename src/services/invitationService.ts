import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';

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
    }

    if (existingInvitation) {
        // ✅ FIX INV-004: Regenerate token on update (security)
        return await prisma.userInvitation.update({
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
    }

    // ✅ FIX INV-002: Explicit token generation with crypto.randomUUID()
    return await prisma.userInvitation.create({
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
