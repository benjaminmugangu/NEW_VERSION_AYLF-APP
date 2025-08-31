import type {
  User, DbUser,
  Report, DbReport, ReportFormData,
  Activity, DbActivity,
  SmallGroup, DbSmallGroup, SmallGroupFormData
} from './types';
import type { UserFormData } from '@/schemas/user';
import type { ActivityFormData } from '@/services/activityService';
import { User as SupabaseUser } from '@supabase/supabase-js';

// --- User Mappers ---
export const mapDbUserToUser = (dbUser: DbUser & { siteName?: string, smallGroupName?: string }, supabaseUser?: SupabaseUser): User => {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    status: dbUser.status,
    siteId: dbUser.site_id,
    smallGroupId: dbUser.small_group_id,
    mandateStartDate: dbUser.mandate_start_date,
    mandateEndDate: dbUser.mandate_end_date,
    app_metadata: supabaseUser?.app_metadata,
    user_metadata: supabaseUser?.user_metadata,
    aud: supabaseUser?.aud,
    createdAt: supabaseUser?.created_at,
    siteName: dbUser.siteName,
    smallGroupName: dbUser.smallGroupName,
  };
};

export const mapUserToDb = (updates: Partial<User>): Partial<DbUser> => {
  const dbUpdates: Partial<DbUser> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.siteId !== undefined) dbUpdates.site_id = updates.siteId;
  if (updates.smallGroupId !== undefined) dbUpdates.small_group_id = updates.smallGroupId;
  if (updates.mandateStartDate !== undefined) dbUpdates.mandate_start_date = updates.mandateStartDate;
  if (updates.mandateEndDate !== undefined) dbUpdates.mandate_end_date = updates.mandateEndDate;
  return dbUpdates;
};

// --- Report Mappers ---
export const mapDbReportToReport = (dbReport: DbReport): Report => {
  return {
    id: dbReport.id,
    title: dbReport.title,
    activityDate: dbReport.activity_date,
    submittedBy: dbReport.submitted_by,
    submissionDate: dbReport.submission_date,
    level: dbReport.level,
    siteId: dbReport.site_id,
    smallGroupId: dbReport.small_group_id,
    activityTypeId: dbReport.activity_type_id,
    thematic: dbReport.thematic,
    speaker: dbReport.speaker,
    moderator: dbReport.moderator,
    girlsCount: dbReport.girls_count,
    boysCount: dbReport.boys_count,
    participantsCountReported: dbReport.participants_count_reported,
    totalExpenses: dbReport.total_expenses,
    currency: dbReport.currency,
    content: dbReport.content,
    images: dbReport.images,
    financialSummary: dbReport.financial_summary,
    status: dbReport.status,
    reviewNotes: dbReport.review_notes,
    attachments: dbReport.attachments,
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
  if (formData.activityDate !== undefined) dbData.activity_date = formData.activityDate;
  if (formData.level !== undefined) dbData.level = formData.level;
  if (formData.siteId !== undefined) dbData.site_id = formData.siteId;
  if (formData.smallGroupId !== undefined) dbData.small_group_id = formData.smallGroupId;
  if (formData.activityTypeId !== undefined) dbData.activity_type_id = formData.activityTypeId;
  if (formData.activityId !== undefined) dbData.activity_id = formData.activityId;
  if (formData.thematic !== undefined) dbData.thematic = formData.thematic;
  if (formData.speaker !== undefined) dbData.speaker = formData.speaker;
  if (formData.moderator !== undefined) dbData.moderator = formData.moderator;
  if (formData.girlsCount !== undefined) dbData.girls_count = formData.girlsCount;
  if (formData.boysCount !== undefined) dbData.boys_count = formData.boysCount;
  if (formData.totalExpenses !== undefined) dbData.total_expenses = formData.totalExpenses;
  if (formData.currency !== undefined) dbData.currency = formData.currency;
  if (formData.content !== undefined) dbData.content = formData.content;
  if (formData.financialSummary !== undefined) dbData.financial_summary = formData.financialSummary;
  if (formData.images !== undefined) dbData.images = formData.images;
  if (formData.submittedBy !== undefined) dbData.submitted_by = formData.submittedBy;
  if (formData.status !== undefined) dbData.status = formData.status;
  if (formData.reviewNotes !== undefined) dbData.review_notes = formData.reviewNotes;
  return dbData;
};

// --- Activity Mappers ---
export const mapDbActivityToActivity = (dbActivity: DbActivity): Activity => ({
  // The 'as any' cast is used for enriched fields that are not part of the base DbActivity type.
  // This allows the mapper to handle both base and enriched objects gracefully.
  id: dbActivity.id,
  title: dbActivity.title,
  thematic: dbActivity.thematic,
  date: dbActivity.date,
  level: dbActivity.level,
  status: dbActivity.status,
  siteId: dbActivity.site_id,
  smallGroupId: dbActivity.small_group_id,
  activityTypeId: dbActivity.activity_type_id,
  participantsCountPlanned: dbActivity.participants_count_planned,
  createdBy: dbActivity.created_by,
  createdAt: dbActivity.created_at,
  siteName: 'siteName' in dbActivity ? (dbActivity as any).siteName : undefined,
  smallGroupName: 'smallGroupName' in dbActivity ? (dbActivity as any).smallGroupName : undefined,
  activityTypeName: 'activityTypeName' in dbActivity ? (dbActivity as any).activityTypeName : undefined,
  participantsCount: 'participantsCount' in dbActivity ? (dbActivity as any).participantsCount : undefined,
});

export const mapActivityFormDataToDb = (formData: Partial<ActivityFormData>): Partial<DbActivity> => {
  const dbData: Partial<DbActivity> = {};
  if (formData.title !== undefined) dbData.title = formData.title;
  if (formData.thematic !== undefined) dbData.thematic = formData.thematic;
  if (formData.date !== undefined) dbData.date = formData.date.toISOString();
  if (formData.level !== undefined) dbData.level = formData.level;
  if (formData.status !== undefined) dbData.status = formData.status;
  if (formData.siteId !== undefined) dbData.site_id = formData.siteId;
  if (formData.smallGroupId !== undefined) dbData.small_group_id = formData.smallGroupId;
  if (formData.activityTypeId !== undefined) dbData.activity_type_id = formData.activityTypeId;
  if (formData.participantsCountPlanned !== undefined) dbData.participants_count_planned = formData.participantsCountPlanned;
  if (formData.createdBy !== undefined) dbData.created_by = formData.createdBy;
  return dbData;
};

// --- Small Group Mappers ---
export const mapDbSmallGroupToSmallGroup = (dbSmallGroup: DbSmallGroup): SmallGroup => {
  // The 'as any' cast is used for enriched fields that are not part of the base DbSmallGroup type.
  const enrichedDbSmallGroup = dbSmallGroup as any;
  const memberSource = enrichedDbSmallGroup.small_group_members || enrichedDbSmallGroup.members;
  const memberCountObject = Array.isArray(memberSource) && memberSource.length > 0 ? memberSource[0] : { count: 0 };

  return {
    id: dbSmallGroup.id,
    name: dbSmallGroup.name,
    siteId: dbSmallGroup.site_id,
    leaderId: dbSmallGroup.leader_id,
    logisticsAssistantId: dbSmallGroup.logistics_assistant_id,
    financeAssistantId: dbSmallGroup.finance_assistant_id,
    meetingDay: dbSmallGroup.meeting_day,
    meetingTime: dbSmallGroup.meeting_time,
    meetingLocation: dbSmallGroup.meeting_location,
    siteName: enrichedDbSmallGroup.sites?.name,
    leaderName: enrichedDbSmallGroup.leader?.name,
    memberCount: memberCountObject?.count ?? 0,
    leader: enrichedDbSmallGroup.leader ? mapDbUserToUser(enrichedDbSmallGroup.leader) : undefined,
    logisticsAssistant: enrichedDbSmallGroup.logisticsAssistant ? mapDbUserToUser(enrichedDbSmallGroup.logisticsAssistant) : undefined,
    financeAssistant: enrichedDbSmallGroup.financeAssistant ? mapDbUserToUser(enrichedDbSmallGroup.financeAssistant) : undefined,
  };
};

export const mapSmallGroupFormDataToDb = (formData: SmallGroupFormData): Partial<DbSmallGroup> => {
  return {
    name: formData.name,
    leader_id: formData.leaderId,
    logistics_assistant_id: formData.logisticsAssistantId,
    finance_assistant_id: formData.financeAssistantId,
    meeting_day: formData.meetingDay,
    meeting_time: formData.meetingTime,
    meeting_location: formData.meetingLocation,
  };
};
