import type {
  User,
  Report as FrontendReport, ReportFormData,
  Activity as FrontendActivity,
  SmallGroup as FrontendSmallGroup, SmallGroupFormData
} from './types';
import type {
  Profile,
  Report as DbReport,
  Activity as DbActivity,
  SmallGroup as DbSmallGroup
} from '@prisma/client';
import type { UserFormData } from '@/schemas/user';
import type { ActivityFormData } from '@/schemas/activity';
import { User as SupabaseUser } from '@supabase/supabase-js';

// --- User Mappers ---
export const mapDbUserToUser = (dbUser: Profile & { siteName?: string, smallGroupName?: string }, supabaseUser?: SupabaseUser): User => {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role as any, // Cast if enum mismatch
    status: dbUser.status as any,
    siteId: dbUser.siteId,
    smallGroupId: dbUser.smallGroupId,
    mandateStartDate: dbUser.mandateStartDate?.toISOString(),
    mandateEndDate: dbUser.mandateEndDate?.toISOString(),
    app_metadata: supabaseUser?.app_metadata,
    user_metadata: supabaseUser?.user_metadata,
    aud: supabaseUser?.aud,
    createdAt: supabaseUser?.created_at,
    siteName: dbUser.siteName,
    smallGroupName: dbUser.smallGroupName,
  };
};

export const mapUserToDb = (updates: Partial<User>): Partial<Profile> => {
  const dbUpdates: Partial<Profile> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.role !== undefined) dbUpdates.role = updates.role as any;
  if (updates.status !== undefined) dbUpdates.status = updates.status as any;
  if (updates.siteId !== undefined) dbUpdates.siteId = updates.siteId;
  if (updates.smallGroupId !== undefined) dbUpdates.smallGroupId = updates.smallGroupId;
  if (updates.mandateStartDate !== undefined) dbUpdates.mandateStartDate = updates.mandateStartDate ? new Date(updates.mandateStartDate) : null;
  if (updates.mandateEndDate !== undefined) dbUpdates.mandateEndDate = updates.mandateEndDate ? new Date(updates.mandateEndDate) : null;
  return dbUpdates;
};

// --- Report Mappers ---
export const mapDbReportToReport = (dbReport: DbReport): FrontendReport => {
  return {
    id: dbReport.id,
    title: dbReport.title,
    activityDate: dbReport.activityDate.toISOString(),
    submittedBy: dbReport.submittedById,
    submissionDate: dbReport.submissionDate.toISOString(),
    level: dbReport.level as any,
    siteId: dbReport.siteId ?? undefined,
    smallGroupId: dbReport.smallGroupId ?? undefined,
    activityTypeId: dbReport.activityTypeId,
    thematic: dbReport.thematic,
    speaker: dbReport.speaker ?? undefined,
    moderator: dbReport.moderator ?? undefined,
    girlsCount: dbReport.girlsCount ?? undefined,
    boysCount: dbReport.boysCount ?? undefined,
    participantsCountReported: dbReport.participantsCountReported ?? undefined,
    totalExpenses: dbReport.totalExpenses ?? undefined,
    currency: dbReport.currency ?? undefined,
    content: dbReport.content,
    images: dbReport.images ? (dbReport.images as any) : undefined,
    financialSummary: dbReport.financialSummary ?? undefined,
    status: dbReport.status as any,
    reviewNotes: dbReport.reviewNotes ?? undefined,
    attachments: dbReport.attachments ? (dbReport.attachments as any) : undefined,
    // Handle optional relation fields
    submittedByName: 'submittedByName' in dbReport ? (dbReport as any).submittedByName : undefined,
    siteName: 'siteName' in dbReport ? (dbReport as any).siteName : undefined,
    smallGroupName: 'smallGroupName' in dbReport ? (dbReport as any).smallGroupName : undefined,
    activityTypeName: 'activityTypeName' in dbReport ? (dbReport as any).activityTypeName : undefined,
  };
};

export const mapReportFormDataToDb = (formData: Partial<ReportFormData>): Partial<DbReport> => {
  const dbData: Partial<DbReport> = {};
  if (formData.title !== undefined) dbData.title = formData.title;
  if (formData.activityDate !== undefined) dbData.activityDate = new Date(formData.activityDate);
  if (formData.level !== undefined) dbData.level = formData.level as any;
  if (formData.siteId !== undefined) dbData.siteId = formData.siteId;
  if (formData.smallGroupId !== undefined) dbData.smallGroupId = formData.smallGroupId;
  if (formData.activityTypeId !== undefined) dbData.activityTypeId = formData.activityTypeId;
  if (formData.activityId !== undefined) dbData.activityId = formData.activityId;
  if (formData.thematic !== undefined) dbData.thematic = formData.thematic;
  if (formData.speaker !== undefined) dbData.speaker = formData.speaker;
  if (formData.moderator !== undefined) dbData.moderator = formData.moderator;
  if (formData.girlsCount !== undefined) dbData.girlsCount = formData.girlsCount;
  if (formData.boysCount !== undefined) dbData.boysCount = formData.boysCount;
  if (formData.participantsCountReported !== undefined) dbData.participantsCountReported = formData.participantsCountReported;
  if (formData.totalExpenses !== undefined) dbData.totalExpenses = formData.totalExpenses;
  if (formData.currency !== undefined) dbData.currency = formData.currency;
  if (formData.content !== undefined) dbData.content = formData.content;
  if (formData.financialSummary !== undefined) dbData.financialSummary = formData.financialSummary;
  if (formData.images !== undefined) dbData.images = formData.images as any;
  if (formData.submittedBy !== undefined) dbData.submittedById = formData.submittedBy;
  if (formData.status !== undefined) dbData.status = formData.status as any;
  if (formData.reviewNotes !== undefined) dbData.reviewNotes = formData.reviewNotes;
  return dbData;
};

// --- Activity Mappers ---
export const mapDbActivityToActivity = (dbActivity: DbActivity): FrontendActivity => ({
  id: dbActivity.id,
  title: dbActivity.title,
  thematic: dbActivity.thematic,
  date: dbActivity.date.toISOString(),
  level: dbActivity.level as any,
  status: dbActivity.status as any,
  siteId: dbActivity.siteId ?? undefined,
  smallGroupId: dbActivity.smallGroupId ?? undefined,
  activityTypeId: dbActivity.activityTypeId,
  participantsCountPlanned: dbActivity.participantsCountPlanned ?? undefined,
  createdBy: dbActivity.createdById,
  createdAt: dbActivity.createdAt.toISOString(),
  siteName: 'siteName' in dbActivity ? (dbActivity as any).siteName : undefined,
  smallGroupName: 'smallGroupName' in dbActivity ? (dbActivity as any).smallGroupName : undefined,
  activityTypeName: 'activityTypeName' in dbActivity ? (dbActivity as any).activityTypeName : undefined,
  participantsCount: 'participantsCount' in dbActivity ? (dbActivity as any).participantsCount : undefined,
});

export const mapActivityFormDataToDb = (formData: Partial<ActivityFormData>): Partial<DbActivity> => {
  const dbData: Partial<DbActivity> = {};
  if (formData.title !== undefined) dbData.title = formData.title;
  if (formData.thematic !== undefined) dbData.thematic = formData.thematic;
  if (formData.date !== undefined) dbData.date = formData.date;
  if (formData.level !== undefined) dbData.level = formData.level as any;
  if (formData.status !== undefined) dbData.status = formData.status as any;
  if (formData.siteId !== undefined) dbData.siteId = formData.siteId;
  if (formData.smallGroupId !== undefined) dbData.smallGroupId = formData.smallGroupId;
  if (formData.activityTypeId !== undefined) dbData.activityTypeId = formData.activityTypeId;
  if (formData.participantsCountPlanned !== undefined) dbData.participantsCountPlanned = formData.participantsCountPlanned;
  if (formData.createdBy !== undefined) dbData.createdById = formData.createdBy;
  return dbData;
};

// --- Small Group Mappers ---
export const mapDbSmallGroupToSmallGroup = (dbSmallGroup: DbSmallGroup): FrontendSmallGroup => {
  const enrichedDbSmallGroup = dbSmallGroup as any;
  const memberCount = enrichedDbSmallGroup._count?.registeredMembers ?? 0;

  return {
    id: dbSmallGroup.id,
    name: dbSmallGroup.name,
    siteId: dbSmallGroup.siteId,
    leaderId: dbSmallGroup.leaderId ?? undefined,
    logisticsAssistantId: dbSmallGroup.logisticsAssistantId ?? undefined,
    financeAssistantId: dbSmallGroup.financeAssistantId ?? undefined,
    meetingDay: dbSmallGroup.meetingDay ?? undefined,
    meetingTime: dbSmallGroup.meetingTime ?? undefined,
    meetingLocation: dbSmallGroup.meetingLocation ?? undefined,
    siteName: enrichedDbSmallGroup.site?.name,
    leaderName: enrichedDbSmallGroup.leader?.name,
    memberCount: memberCount,
    leader: enrichedDbSmallGroup.leader ? {
      id: enrichedDbSmallGroup.leader.id,
      name: enrichedDbSmallGroup.leader.name,
      email: enrichedDbSmallGroup.leader.email,
      role: enrichedDbSmallGroup.leader.role,
      status: enrichedDbSmallGroup.leader.status,
      siteId: enrichedDbSmallGroup.leader.siteId,
      smallGroupId: enrichedDbSmallGroup.leader.smallGroupId,
      mandateStartDate: enrichedDbSmallGroup.leader.mandateStartDate?.toISOString(),
      mandateEndDate: enrichedDbSmallGroup.leader.mandateEndDate?.toISOString(),
    } : undefined,
    logisticsAssistant: enrichedDbSmallGroup.logisticsAssistant ? {
      id: enrichedDbSmallGroup.logisticsAssistant.id,
      name: enrichedDbSmallGroup.logisticsAssistant.name,
      email: enrichedDbSmallGroup.logisticsAssistant.email,
      role: enrichedDbSmallGroup.logisticsAssistant.role,
      status: enrichedDbSmallGroup.logisticsAssistant.status,
      siteId: enrichedDbSmallGroup.logisticsAssistant.siteId,
      smallGroupId: enrichedDbSmallGroup.logisticsAssistant.smallGroupId,
      mandateStartDate: enrichedDbSmallGroup.logisticsAssistant.mandateStartDate?.toISOString(),
      mandateEndDate: enrichedDbSmallGroup.logisticsAssistant.mandateEndDate?.toISOString(),
    } : undefined,
    financeAssistant: enrichedDbSmallGroup.financeAssistant ? {
      id: enrichedDbSmallGroup.financeAssistant.id,
      name: enrichedDbSmallGroup.financeAssistant.name,
      email: enrichedDbSmallGroup.financeAssistant.email,
      role: enrichedDbSmallGroup.financeAssistant.role,
      status: enrichedDbSmallGroup.financeAssistant.status,
      siteId: enrichedDbSmallGroup.financeAssistant.siteId,
      smallGroupId: enrichedDbSmallGroup.financeAssistant.smallGroupId,
      mandateStartDate: enrichedDbSmallGroup.financeAssistant.mandateStartDate?.toISOString(),
      mandateEndDate: enrichedDbSmallGroup.financeAssistant.mandateEndDate?.toISOString(),
    } : undefined,
  };
};

export const mapSmallGroupFormDataToDb = (formData: SmallGroupFormData): Partial<DbSmallGroup> => {
  return {
    name: formData.name,
    siteId: formData.siteId || "",
    leaderId: formData.leaderId,
    logisticsAssistantId: formData.logisticsAssistantId,
    financeAssistantId: formData.financeAssistantId,
    meetingDay: formData.meetingDay,
    meetingTime: formData.meetingTime,
    meetingLocation: formData.meetingLocation,
  };
};
