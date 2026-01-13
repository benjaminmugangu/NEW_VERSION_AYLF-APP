'use server';

import { prisma, withRLS } from '@/lib/prisma';
import { UserRole, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createNotification } from './notificationService';
import { ROLES } from '@/lib/constants';
import { ServiceResponse, ErrorCode } from '@/lib/types';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';

export interface CreateInvitationData {
    email: string;
    role: UserRole;
    siteId?: string;
    smallGroupId?: string;
    mandateStartDate?: Date;
    mandateEndDate?: Date;
}

export async function createInvitation(data: CreateInvitationData): Promise<ServiceResponse<any>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

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
            const group = await prisma.smallGroup.findUnique({
                where: { id: smallGroupId },
                select: { siteId: true }
            });
            if (group) siteId = group.siteId;
        }

        const result = await withRLS(user.id, async () => {
            return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                let invitation;
                if (existingInvitation) {
                    invitation = await tx.userInvitation.update({
                        where: { email: data.email },
                        data: {
                            token: randomUUID(),
                            role: data.role,
                            siteId: siteId,
                            smallGroupId: smallGroupId,
                            mandateStartDate: data.mandateStartDate,
                            mandateEndDate: data.mandateEndDate,
                            status: 'pending',
                            expiresAt,
                        },
                    });
                } else {
                    invitation = await tx.userInvitation.create({
                        data: {
                            email: data.email,
                            token: randomUUID(),
                            role: data.role,
                            siteId: siteId,
                            smallGroupId: smallGroupId,
                            mandateStartDate: data.mandateStartDate,
                            mandateEndDate: data.mandateEndDate,
                            expiresAt,
                        },
                    });
                }

                // Notify National Coordinators (Reviewers)
                const nationalCoordinators = await tx.profile.findMany({
                    where: { role: ROLES.NATIONAL_COORDINATOR }
                });

                for (const nc of nationalCoordinators) {
                    await createNotification({
                        userId: nc.id,
                        type: 'USER_INVITED',
                        title: '👤 Nouvelle Invitation Envoyée',
                        message: `Une invitation pour le rôle ${data.role} a été envoyée à ${data.email}.`,
                        link: '/dashboard/admin/invitations',
                    }, tx).catch(err => console.error(`Failed to notify NC ${nc.id}:`, err));
                }

                // Audit Log
                await tx.auditLog.create({
                    data: {
                        actorId: user.id,
                        action: 'CREATE',
                        entityType: 'USER_INVITATION',
                        entityId: invitation.id,
                        metadata: { email: data.email, role: data.role }
                    }
                });

                return invitation;
            });
        });

        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

export async function getInvitationByEmail(email: string): Promise<ServiceResponse<any>> {
    try {
        const invitation = await prisma.userInvitation.findUnique({
            where: { email },
        });
        if (!invitation) return { success: false, error: { message: 'Invitation not found', code: ErrorCode.NOT_FOUND } };
        return { success: true, data: invitation };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

export async function getInvitationByToken(token: string): Promise<ServiceResponse<any>> {
    try {
        const invitation = await prisma.userInvitation.findUnique({
            where: { token },
            include: {
                site: true,
                smallGroup: true
            }
        });

        if (!invitation) return { success: false, error: { message: 'Invitation not found', code: ErrorCode.NOT_FOUND } };

        if (invitation.expiresAt < new Date()) {
            await prisma.userInvitation.update({
                where: { id: invitation.id },
                data: { status: 'expired' },
            });
            return { success: false, error: { message: 'Invitation has expired', code: ErrorCode.VALIDATION_ERROR } };
        }

        return { success: true, data: invitation };
    } catch (error: any) {
        return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
    }
}

export async function acceptInvitation(email: string): Promise<ServiceResponse<any>> {
    try {
        const result = await prisma.userInvitation.update({
            where: { email },
            data: { status: 'accepted' },
        });
        return { success: true, data: result };
    } catch (error: any) {
        let code = ErrorCode.INTERNAL_ERROR;
        if (error.code === 'P2025') code = ErrorCode.NOT_FOUND;
        return { success: false, error: { message: error.message, code } };
    }
}

export async function deleteInvitation(email: string): Promise<ServiceResponse<void>> {
    try {
        const { getUser } = getKindeServerSession();
        const user = await getUser();
        if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const invitation = await tx.userInvitation.findUnique({
                where: { email }
            });
            if (!invitation) throw new Error('NOT_FOUND: Invitation not found');

            await tx.userInvitation.delete({
                where: { email },
            });

            // Audit Log
            await tx.auditLog.create({
                data: {
                    actorId: user.id,
                    action: 'DELETE',
                    entityType: 'USER_INVITATION',
                    entityId: invitation.id,
                    metadata: { email }
                }
            });
        });

        return { success: true };
    } catch (error: any) {
        let code = ErrorCode.INTERNAL_ERROR;
        if (error.message.includes('NOT_FOUND') || error.code === 'P2025') code = ErrorCode.NOT_FOUND;
        return { success: false, error: { message: error.message, code } };
    }
}
