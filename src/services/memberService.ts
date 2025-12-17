// src/services/memberService.ts
'use server';

import { prisma } from '@/lib/prisma';
import type { User, Member, MemberWithDetails, MemberFormData } from '@/lib/types';

// Server-safe date filter definition (avoid importing client component module)
type ServerDateFilter = {
  rangeKey?: string;
  from?: Date;
  to?: Date;
};

const computeDateRange = (dateFilter?: ServerDateFilter): { startDate?: Date; endDate?: Date } => {
  if (!dateFilter) return {};
  if (dateFilter.from || dateFilter.to) return { startDate: dateFilter.from, endDate: dateFilter.to };
  const key = dateFilter.rangeKey;
  if (!key || key === 'all_time') return {};
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (key) {
    case 'today': {
      const s = startOfDay(now);
      const e = new Date(s);
      e.setDate(e.getDate() + 1);
      return { startDate: s, endDate: e };
    }
    case 'this_week': {
      const s = startOfDay(now);
      const day = s.getDay();
      const diff = (day + 6) % 7; // Monday as start
      s.setDate(s.getDate() - diff);
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      return { startDate: s, endDate: e };
    }
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { startDate: s, endDate: e };
    }
    case 'last_30_days': {
      const e = startOfDay(now);
      const s = new Date(e);
      s.setDate(s.getDate() - 30);
      return { startDate: s, endDate: e };
    }
    case 'last_90_days': {
      const e = startOfDay(now);
      const s = new Date(e);
      s.setDate(s.getDate() - 90);
      return { startDate: s, endDate: e };
    }
    case 'this_year': {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear() + 1, 0, 1);
      return { startDate: s, endDate: e };
    }
    default:
      return {};
  }
};

export interface MemberFilters {
  user: User | null;
  searchTerm?: string;
  smallGroupId?: string;
  dateFilter?: ServerDateFilter;
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
  // National members might not have a siteId, so we verify level instead or just allow it
  if (!siteId && m.level !== 'national') {
    // Optional warning or fallback, but don't crash
    // console.warn('Member missing siteId:', m.id);
  }
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
    siteName: m.site?.name || 'N/A',
    smallGroupName: m.smallGroup?.name || 'N/A',
  };
};

export async function getFilteredMembers(filters: MemberFilters): Promise<MemberWithDetails[]> {
  const { user, searchTerm, dateFilter, typeFilter, smallGroupId } = filters;

  if (!user) {
    throw new Error('Authentication required.');
  }

  const where: any = {};

  if (smallGroupId) {
    where.smallGroupId = smallGroupId;
  }

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
      .map(([key]) => key as Member['type']);
    if (activeTypes.length > 0) {
      const prismaTypes = activeTypes.map((t) => (t === 'non-student' ? 'non_student' : 'student'));
      where.type = { in: prismaTypes };
    }
  }

  if (searchTerm) {
    where.name = { contains: searchTerm, mode: 'insensitive' };
  }

  const members = await prisma.member.findMany({
    where,
    include: {
      site: true,
      smallGroup: true,
    },
    orderBy: { joinDate: 'desc' },
  });

  return members.map(mapPrismaMemberToWithDetails);
}

export async function getMemberById(memberId: string): Promise<MemberWithDetails> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      site: true,
      smallGroup: true,
    },
  });

  if (!member) {
    throw new Error('Member not found.');
  }

  return mapPrismaMemberToWithDetails(member);
}

export async function updateMember(memberId: string, formData: MemberFormData): Promise<Member> {
  const updateData: any = {
    name: formData.name,
    gender: formData.gender === 'female' ? 'female' : 'male',
    type: formData.type === 'non-student' ? 'non_student' : 'student',
    joinDate: new Date(formData.joinDate),
    phone: formData.phone,
    email: formData.email,
    level: formData.level,
    siteId: formData.siteId,
    smallGroupId: formData.smallGroupId,
  };

  const member = await prisma.member.update({
    where: { id: memberId },
    data: updateData,
  });

  return mapPrismaMemberToBase(member);
}

export async function deleteMember(memberId: string): Promise<void> {
  await prisma.member.delete({
    where: { id: memberId },
  });
}

export async function createMember(formData: MemberFormData): Promise<Member> {
  const member = await prisma.member.create({
    data: {
      name: formData.name,
      gender: formData.gender === 'female' ? 'female' : 'male',
      type: formData.type === 'non-student' ? 'non_student' : 'student',
      joinDate: new Date(formData.joinDate),
      phone: formData.phone,
      email: formData.email,
      level: formData.level,
      siteId: formData.siteId, // Removed ! assertion to allow optional
      smallGroupId: formData.smallGroupId,
    },
  });

  return mapPrismaMemberToBase(member);
}