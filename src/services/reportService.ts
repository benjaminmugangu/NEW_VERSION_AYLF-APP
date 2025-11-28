'use server';

import { prisma } from '@/lib/prisma';
import { Report, ReportWithDetails, ReportFormData, User, UserRole } from '@/lib/types';

// Helper to normalize images from JSON
const normalizeImages = (images: any): Array<{ name: string; url: string }> | undefined => {
  if (!images) return undefined;
  if (!Array.isArray(images)) return undefined;
  return images
    .map((it: any) => {
      const name = typeof it?.name === 'string' ? it.name : undefined;
      const url = typeof it?.url === 'string' ? it.url : undefined;
      if (name && url) return { name, url };
      return undefined;
    })
    .filter(Boolean) as Array<{ name: string; url: string }>;
};

const normalizeAttachments = (attachments: any): string[] | undefined => {
  if (!attachments) return undefined;
  if (!Array.isArray(attachments)) return undefined;
  return attachments.filter((x: any) => typeof x === 'string') as string[];
};

// Server-safe date filter
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
      const diff = (day + 6) % 7; // Monday start
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

export interface ReportFilters {
  user?: User | null;
  entity?: { type: 'site' | 'smallGroup'; id: string };
  searchTerm?: string;
  dateFilter?: ServerDateFilter;
  statusFilter?: Record<Report['status'], boolean>;
}

// Helper to map Prisma result to Report type
const mapPrismaReportToModel = (report: any): ReportWithDetails => {
  return {
    id: report.id,
    title: report.title,
    activityDate: report.activityDate ? report.activityDate.toISOString() : '',
    submissionDate: report.submissionDate ? report.submissionDate.toISOString() : '',
    level: report.level,
    status: report.status,
    content: report.content,
    thematic: report.thematic,
    speaker: report.speaker || undefined,
    moderator: report.moderator || undefined,
    girlsCount: report.girlsCount || undefined,
    boysCount: report.boysCount || undefined,
    participantsCountReported: report.participantsCountReported || undefined,
    totalExpenses: report.totalExpenses || undefined,
    currency: report.currency || undefined,
    financialSummary: report.financialSummary || undefined,
    reviewNotes: report.reviewNotes || undefined,
    images: normalizeImages(report.images),
    attachments: normalizeAttachments(report.attachments),
    submittedBy: report.submittedById,
    siteId: report.siteId || undefined,
    smallGroupId: report.smallGroupId || undefined,
    activityTypeId: report.activityTypeId,

    // Enriched fields
    submittedByName: report.submittedBy?.name,
    siteName: report.site?.name,
    smallGroupName: report.smallGroup?.name,
  };
};

export async function getReportById(id: string): Promise<Report> {
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      submittedBy: true,
      site: true,
      smallGroup: true,
      activityType: true,
    }
  });

  if (!report) {
    throw new Error('Report not found.');
  }

  return mapPrismaReportToModel(report);
}

export async function createReport(reportData: ReportFormData): Promise<Report> {
  const report = await prisma.report.create({
    data: {
      title: reportData.title,
      activityDate: reportData.activityDate,
      level: reportData.level,
      status: reportData.status,
      content: reportData.content,
      thematic: reportData.thematic,
      speaker: reportData.speaker,
      moderator: reportData.moderator,
      girlsCount: reportData.girlsCount,
      boysCount: reportData.boysCount,
      participantsCountReported: reportData.participantsCountReported,
      totalExpenses: reportData.totalExpenses,
      currency: reportData.currency,
      financialSummary: reportData.financialSummary,
      images: reportData.images as any, // Prisma handles JSON
      attachments: reportData.attachments as any,
      submittedById: reportData.submittedBy,
      siteId: reportData.siteId,
      smallGroupId: reportData.smallGroupId,
      activityTypeId: reportData.activityTypeId,
      activityId: reportData.activityId,
    },
    include: {
      submittedBy: true,
      site: true,
      smallGroup: true,
      activityType: true,
    }
  });

  return mapPrismaReportToModel(report);
}

export async function updateReport(reportId: string, updatedData: Partial<ReportFormData>): Promise<ReportWithDetails> {
  const updateData: any = {};
  // Map fields
  if (updatedData.title !== undefined) updateData.title = updatedData.title;
  if (updatedData.activityDate !== undefined) updateData.activityDate = updatedData.activityDate;
  if (updatedData.level !== undefined) updateData.level = updatedData.level;
  if (updatedData.status !== undefined) updateData.status = updatedData.status;
  if (updatedData.content !== undefined) updateData.content = updatedData.content;
  if (updatedData.thematic !== undefined) updateData.thematic = updatedData.thematic;
  if (updatedData.speaker !== undefined) updateData.speaker = updatedData.speaker;
  if (updatedData.moderator !== undefined) updateData.moderator = updatedData.moderator;
  if (updatedData.girlsCount !== undefined) updateData.girlsCount = updatedData.girlsCount;
  if (updatedData.boysCount !== undefined) updateData.boysCount = updatedData.boysCount;
  if (updatedData.participantsCountReported !== undefined) updateData.participantsCountReported = updatedData.participantsCountReported;
  if (updatedData.totalExpenses !== undefined) updateData.totalExpenses = updatedData.totalExpenses;
  if (updatedData.currency !== undefined) updateData.currency = updatedData.currency;
  if (updatedData.financialSummary !== undefined) updateData.financialSummary = updatedData.financialSummary;
  if (updatedData.images !== undefined) updateData.images = updatedData.images;
  if (updatedData.attachments !== undefined) updateData.attachments = updatedData.attachments;
  if (updatedData.siteId !== undefined) updateData.siteId = updatedData.siteId;
  if (updatedData.smallGroupId !== undefined) updateData.smallGroupId = updatedData.smallGroupId;
  if (updatedData.activityTypeId !== undefined) updateData.activityTypeId = updatedData.activityTypeId;
  if (updatedData.activityId !== undefined) updateData.activityId = updatedData.activityId;

  const report = await prisma.report.update({
    where: { id: reportId },
    data: updateData,
    include: {
      submittedBy: true,
      site: true,
      smallGroup: true,
      activityType: true,
    }
  });

  return mapPrismaReportToModel(report);
}

export async function deleteReport(id: string): Promise<void> {
  await prisma.report.delete({
    where: { id },
  });
}

export async function getFilteredReports(filters: ReportFilters): Promise<ReportWithDetails[]> {
  const { user, entity, searchTerm, dateFilter, statusFilter } = filters;
  if (!user && !entity) {
    throw new Error('User or entity is required to fetch reports.');
  }

  const where: any = {};

  if (entity) {
    if (entity.type === 'site') where.siteId = entity.id;
    else where.smallGroupId = entity.id;
  } else if (user) {
    switch (user.role) {
      case 'site_coordinator':
        if (user.siteId) where.siteId = user.siteId;
        else return [];
        break;
      case 'small_group_leader':
        if (user.smallGroupId) where.smallGroupId = user.smallGroupId;
        else return [];
        break;
    }
  }

  if (dateFilter) {
    const { startDate, endDate } = computeDateRange(dateFilter);
    if (startDate || endDate) {
      where.activityDate = {};
      if (startDate) where.activityDate.gte = startDate;
      if (endDate) where.activityDate.lte = endDate;
    }
  }

  if (searchTerm) {
    where.title = { contains: searchTerm, mode: 'insensitive' };
  }

  if (statusFilter) {
    const activeStatuses = Object.entries(statusFilter)
      .filter(([, isActive]) => isActive)
      .map(([status]) => status);
    if (activeStatuses.length > 0) {
      where.status = { in: activeStatuses };
    }
  }

  const reports = await prisma.report.findMany({
    where,
    include: {
      submittedBy: true,
      site: true,
      smallGroup: true,
      activityType: true,
    },
    orderBy: { submissionDate: 'desc' }
  });

  return reports.map(mapPrismaReportToModel);
}
