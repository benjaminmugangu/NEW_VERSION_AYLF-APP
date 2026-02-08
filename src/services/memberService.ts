// src/services/memberService.ts
'use server';

import { prisma, basePrisma, withRLS } from '@/lib/prisma';
import type { User, Member, MemberWithDetails, MemberFormData, ServiceResponse } from '@/lib/types';
import { ErrorCode } from '@/lib/types';
import { notifyMemberAdded } from './notificationService';
import { ROLES } from '@/lib/constants';
import { createAuditLog } from './auditLogService';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { type DateFilterValue, getDateRangeFromFilterValue } from '@/lib/dateUtils';

const computeDateRange = (dateFilter?: DateFilterValue): { startDate?: Date; endDate?: Date } => {
  return getDateRangeFromFilterValue(dateFilter as any);
};

export interface MemberFilters {
  user: User | null;
  searchTerm?: string;
  smallGroupId?: string;
  dateFilter?: DateFilterValue;
  typeFilter?: Record<Member['type'], boolean>;
}

// Helpers to normalize Prisma row -> frontend types
const normalizeGender = (g: any): Member['gender'] => (g === 'female' ? 'female' : 'male');
const normalizeTypeFromPrisma = (t: any): Member['type'] =>
  t === 'non_student' || t === 'non-student' ? 'non-student' : 'student';
const normalizeLevel = (l: any): Member['level'] =>
  l === 'site' || l === 'small_group' || l === 'national' ? l : 'national';

const mapPrismaMemberToBase = (m: any): Member => {
  const gender = normalizeGender(m.gender);
  const type = normalizeTypeFromPrisma(m.type);
  const level = normalizeLevel(m.level);
  const joinDate =
    m.joinDate instanceof Date
      ? m.joinDate.toISOString().substring(0, 10)
      : m.joinDate ?? new Date().toISOString().substring(0, 10);
  const siteId: string | null | undefined = m.siteId;
  return {
    id: m.id,
    name: m.name,
    gender,
    type,
    joinDate,
    phone: m.phone ?? undefined,
    email: m.email ?? undefined,
    level,
    siteId: siteId ?? undefined,
    smallGroupId: m.smallGroupId ?? undefined,
    userId: m.userId ?? undefined,
  };
};

const mapPrismaMemberToWithDetails = (m: any): MemberWithDetails => {
  const base = mapPrismaMemberToBase(m);
  return {
    ...base,
    siteName: m.site?.name || 'Non assigné',
    smallGroupName: m.smallGroup?.name || 'Hors groupe',
  };
};

export async function getFilteredMembers(filters: MemberFilters): Promise<ServiceResponse<MemberWithDetails[]>> {
  try {
    const { user } = filters;
    if (!user) return { success: false, error: { message: 'Authentication required.', code: ErrorCode.UNAUTHORIZED } };

    const result = await withRLS(user.id, async () => {
      const where = buildMemberWhereClause(user, filters);

      const members = await prisma.member.findMany({
        where,
        include: {
          site: true,
          smallGroup: true,
        },
        orderBy: { joinDate: 'desc' },
      });

      return (members as any[]).map(mapPrismaMemberToWithDetails);
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: { message: error.message, code: ErrorCode.INTERNAL_ERROR } };
  }
}

function buildMemberWhereClause(user: User, filters: Omit<MemberFilters, 'user'>) {
  const { searchTerm, dateFilter, typeFilter, smallGroupId } = filters;
  const where: any = {};

  // 1. RBAC & Hierarchy Guard
  if (user.role === 'SITE_COORDINATOR' && user.siteId) {
    where.siteId = user.siteId;
  } else if (user.role === 'SMALL_GROUP_LEADER' && user.smallGroupId) {
    where.smallGroupId = user.smallGroupId;
  }

  if (smallGroupId) {
    if (user.role === 'SMALL_GROUP_LEADER' && smallGroupId !== user.smallGroupId) {
      // Small Group Leader can't filter for other groups
    } else {
      where.smallGroupId = smallGroupId;
    }
  }

  // 2. Metadata Filters
  if (dateFilter) {
    const { startDate, endDate } = computeDateRange(dateFilter);
    if (startDate || endDate) {
      where.joinDate = {};
      if (startDate) where.joinDate.gte = startDate;
      if (endDate) where.joinDate.lte = endDate;
    }
  }

  if (typeFilter) {
    const activeTypes = Object.entries(typeFilter)
      .filter(([, value]) => value)
      .map(([key]: [string, any]) => key as Member['type']);
    if (activeTypes.length > 0) {
      where.type = { in: activeTypes.map((t: string) => t === 'non-student' ? 'non_student' : 'student') };
    }
  }

  if (searchTerm) {
    where.name = { contains: searchTerm, mode: 'insensitive' };
  }

  return where;
}

export async function getMemberById(memberId: string): Promise<ServiceResponse<MemberWithDetails>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const result = await withRLS(user.id, async () => {
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: {
          site: true,
          smallGroup: true,
        },
      });

      if (!member) throw new Error('NOT_FOUND: Member not found.');
      return mapPrismaMemberToWithDetails(member);
    });

    return { success: true, data: result };
  } catch (error: any) {
    let code = ErrorCode.INTERNAL_ERROR;
    if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
    return { success: false, error: { message: error.message, code } };
  }
}

export async function createMember(
  formData: MemberFormData,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<Member>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const result = await withRLS(user.id, async () => {
      // Exclusivity Guard
      if (formData.level === 'national') {
        formData.siteId = undefined;
        formData.smallGroupId = undefined;
      } else if (formData.level === 'site') {
        formData.smallGroupId = undefined;
      }

      // Uniqueness Check & Normalization
      if (formData.email) {
        formData.email = formData.email.trim();
        const existingMember = await basePrisma.member.findFirst({
          where: { email: { equals: formData.email, mode: 'insensitive' } }
        });
        if (existingMember) {
          throw new Error(`CONFLICT: A member with email ${formData.email} already exists.`);
        }
      }

      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

        const member = await tx.member.create({
          data: {
            ...formData,
            joinDate: new Date(formData.joinDate),
            type: formData.type === 'non-student' ? 'non_student' : 'student',
          },
          include: {
            site: true,
            smallGroup: true,
          }
        });

        const created = mapPrismaMemberToBase(member);

        // Audit Log
        await createAuditLog({
          actorId: user.id,
          action: 'create',
          entityType: 'Member' as any,
          entityId: member.id,
          metadata: { after: created },
          ipAddress,
          userAgent
        }, tx);

        // --- Notifications ---
        if (member.siteId) {
          const sc = await tx.profile.findFirst({
            where: { siteId: member.siteId, role: ROLES.SITE_COORDINATOR }
          });
          if (sc && sc.id !== user.id) {
            await notifyMemberAdded(sc.id, member.name, member.site?.name || 'votre site', tx);
          }
        }

        if (member.smallGroupId) {
          const group = await tx.smallGroup.findUnique({
            where: { id: member.smallGroupId },
            select: { leaderId: true, name: true }
          });
          if (group?.leaderId && group.leaderId !== user.id) {
            await notifyMemberAdded(group.leaderId, member.name, `le groupe ${group.name}`, tx);
          }
        }

        return created;
      });
    });

    return { success: true, data: result };
  } catch (error: any) {
    let code = ErrorCode.INTERNAL_ERROR;
    if (error.message.includes('CONFLICT')) code = ErrorCode.CONFLICT;
    return { success: false, error: { message: error.message, code } };
  }
}

export async function updateMember(
  memberId: string,
  formData: MemberFormData,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<Member>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    const result = await withRLS(user.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

        const before = await tx.member.findUnique({
          where: { id: memberId }
        });
        if (!before) throw new Error('NOT_FOUND: Member not found');

        // Exclusivity Guard
        if (formData.level === 'national') {
          formData.siteId = undefined;
          formData.smallGroupId = undefined;
        } else if (formData.level === 'site') {
          formData.smallGroupId = undefined;
        }

        const updateData: any = {
          ...formData,
          joinDate: new Date(formData.joinDate),
          type: formData.type === 'non-student' ? 'non_student' : 'student',
        };

        const member = await tx.member.update({
          where: { id: memberId },
          data: updateData,
        });

        const updated = mapPrismaMemberToBase(member);

        // Audit Log
        await createAuditLog({
          actorId: user.id,
          action: 'update',
          entityType: 'Member' as any,
          entityId: memberId,
          metadata: { before, after: updated },
          ipAddress,
          userAgent
        }, tx);

        return updated;
      });
    });

    return { success: true, data: result };
  } catch (error: any) {
    let code = ErrorCode.INTERNAL_ERROR;
    if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
    return { success: false, error: { message: error.message, code } };
  }
}

export async function deleteMember(
  memberId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ServiceResponse<void>> {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user) return { success: false, error: { message: 'Unauthorized', code: ErrorCode.UNAUTHORIZED } };

    await withRLS(user.id, async () => {
      return await basePrisma.$transaction(async (tx: any) => {
        // Manually set RLS context
        await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${user.id.replace(/'/g, "''")}'`);

        const before = await tx.member.findUnique({
          where: { id: memberId }
        });
        if (!before) throw new Error('NOT_FOUND: Member not found');

        // Audit Log
        await createAuditLog({
          actorId: user.id,
          action: 'delete',
          entityType: 'Member' as any,
          entityId: memberId,
          metadata: { before },
          ipAddress,
          userAgent
        }, tx);

        await tx.member.delete({
          where: { id: memberId },
        });
      });
    });

    return { success: true };
  } catch (error: any) {
    let code = ErrorCode.INTERNAL_ERROR;
    if (error.message.includes('NOT_FOUND')) code = ErrorCode.NOT_FOUND;
    return { success: false, error: { message: error.message, code } };
  }
}
