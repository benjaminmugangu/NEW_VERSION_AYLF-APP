import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

export interface CreateInvitationData {
    email: string;
    role: UserRole;
    siteId?: string;
    smallGroupId?: string;
}

export async function createInvitation(data: CreateInvitationData) {
    // Check if invitation already exists
    const existingInvitation = await prisma.userInvitation.findUnique({
        where: { email: data.email },
    });

    if (existingInvitation) {
        return await prisma.userInvitation.update({
            where: { email: data.email },
            data: {
                role: data.role,
                siteId: data.siteId,
                smallGroupId: data.smallGroupId,
                status: 'pending',
            },
        });
    }

    return await prisma.userInvitation.create({
        data: {
            email: data.email,
            role: data.role,
            siteId: data.siteId,
            smallGroupId: data.smallGroupId,
        },
    });
}

export async function getInvitationByEmail(email: string) {
    return await prisma.userInvitation.findUnique({
        where: { email },
    });
}

export async function getInvitationByToken(token: string) {
    return await prisma.userInvitation.findUnique({
        where: { token },
        include: {
            site: true,
            smallGroup: true
        }
    });
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
