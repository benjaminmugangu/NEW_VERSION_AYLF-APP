import { LucideIcon } from "lucide-react";

// =============================================================================
// BASE & CORE TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
}

export type UserRole = 'national_coordinator' | 'site_coordinator' | 'small_group_leader' | 'member';

/**
 * Represents the raw user profile data as it is stored in the 'profiles' table.
 * Uses snake_case for database column names.
 */
export interface DbUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  site_id?: string | null;
  small_group_id?: string | null;
  mandate_start_date?: string;
  mandate_end_date?: string;
  status?: 'active' | 'inactive';
}

/**
 * Represents the enriched User object used throughout the frontend application.
 * Uses camelCase for properties and includes relational data.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  siteId?: string | null;
  smallGroupId?: string | null;
  mandateStartDate?: string;
  mandateEndDate?: string;
  status?: 'active' | 'inactive';

  // Enriched data for UI
  siteName?: string;
  smallGroupName?: string;

  // Supabase specific fields (kept for compatibility if needed, but likely unused)
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  aud?: string;
  createdAt?: string;
}

export interface Site extends BaseEntity {
  name: string;
  city: string;
  country: string;
  creationDate: string; // ISO 8601 date string
  coordinatorId?: string | null;
  coordinator?: User; // Enriched data
  memberCount?: number; // Enriched data
  smallGroupCount?: number; // Enriched data
}

export interface SiteWithDetails extends Site {
  coordinatorName: string | null;
  smallGroupsCount: number;
  membersCount: number;
  coordinatorProfilePicture?: string;
}

export interface SmallGroup {
  id: string;
  name: string;
  siteId: string;
  leaderId?: string;
  logisticsAssistantId?: string;
  financeAssistantId?: string;
  meetingDay?: string; // assoupli: la BD peut renvoyer n'importe quelle chaîne
  meetingTime?: string; // e.g., '18:00'
  meetingLocation?: string;
  // Enriched data for UI
  siteName?: string;
  leaderName?: string;
  memberCount?: number;
  leader?: User;
  logisticsAssistant?: User;
  financeAssistant?: User;
}

export interface DbSmallGroup {
  id: string;
  name: string;
  site_id: string;
  leader_id?: string | null;
  logistics_assistant_id?: string | null;
  finance_assistant_id?: string | null;
  meeting_day?: string | null; // assoupli: valeur libre côté BD
  meeting_time?: string | null;
  meeting_location?: string | null;
}

export interface Member extends BaseEntity {
  userId?: string; // Optional link to a User account
  name: string;
  gender: 'male' | 'female';
  type: 'student' | 'non-student';
  joinDate: string; // ISO 8601 date string
  phone?: string;
  email?: string;
  level: "national" | "site" | "small_group";
  siteId: string;
  smallGroupId?: string;
}

// Enriched Member type for UI display
export type MemberWithDetails = Member & {
  siteName: string;
  smallGroupName: string;
}

// =============================================================================
// FEATURE-SPECIFIC TYPES
// =============================================================================

export type ActivityStatus = 'planned' | 'in_progress' | 'delayed' | 'executed' | 'canceled';

export interface Activity extends BaseEntity {
  title: string;
  thematic: string;
  date: string; // ISO date string
  status: ActivityStatus;
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  activityTypeId: string;
  activityTypeEnum?: 'small_group_meeting' | 'conference' | 'apostolat' | 'deuil' | 'other';
  participantsCountPlanned?: number;
  createdBy: string; // UUID of the user who created the activity
  createdAt: string; // ISO date string
  // Enriched data for UI
  siteName?: string;
  smallGroupName?: string;
  activityTypeName?: string;
  participantsCount?: number;
}

export interface DbActivity {
  id: string;
  title: string;
  thematic: string;
  date: string;
  level: 'national' | 'site' | 'small_group';
  status: ActivityStatus;
  site_id?: string;
  small_group_id?: string;
  activity_type_id: string;
  activity_type_enum?: 'small_group_meeting' | 'conference' | 'apostolat' | 'deuil' | 'other';
  participants_count_planned?: number;
  created_by: string;
  created_at: string;
}

export interface ActivityType {
  id: string;
  name: string;
  category: 'spiritual' | 'outreach' | 'community' | 'training';
  description?: string;
}

export type ReportStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

/**
 * Represents the raw report data as it is stored in the 'reports' table.
 * Uses snake_case for database column names.
 */
export interface DbReport {
  id: string;
  title: string;
  activity_date: string;
  submitted_by: string; // User ID
  submission_date: string; // ISO date string
  level: "national" | "site" | "small_group";
  site_id?: string;
  small_group_id?: string;
  activity_type_id: string;
  activity_id?: string;
  thematic: string;
  speaker?: string;
  moderator?: string;
  girls_count?: number;
  boys_count?: number;
  participants_count_reported?: number;
  total_expenses?: number;
  currency?: string;
  content: string;
  images?: Array<{ name: string; url: string }>;
  financial_summary?: string;
  status: ReportStatus;
  review_notes?: string;
  attachments?: string[];
}

export interface Report extends BaseEntity {
  title: string;
  activityDate: string;
  submittedBy: string; // User ID
  submissionDate: string; // ISO date string
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  activityTypeId: string;
  thematic: string;
  speaker?: string;
  moderator?: string;
  girlsCount?: number;
  boysCount?: number;
  participantsCountReported?: number;
  totalExpenses?: number; // Corrected from 'expenses'
  currency?: string;
  content: string;
  images?: Array<{ name: string; url: string }>;
  financialSummary?: string;
  status: ReportStatus;
  reviewNotes?: string;
  attachments?: string[];
  // Enriched data for UI
  submittedByName?: string;
  siteName?: string;
  smallGroupName?: string;
  activityTypeName?: string;
}

export type ReportWithDetails = Report & {
  site?: Site;
  smallGroup?: SmallGroup;
  submittedByUser?: User;
  activityType?: ActivityType;
}

export interface FinancialTransaction extends BaseEntity {
  date: string; // ISO date string
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  siteId?: string;
  siteName?: string;
  smallGroupId?: string;
  smallGroupName?: string;
  recordedById: string;
  recordedByName?: string;
  recordedByRole?: UserRole;
  // Workflow fields (NEW)
  status?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  // Linked entities
  relatedReportId?: string;
  relatedReportTitle?: string;
  relatedActivityId?: string;
  proofUrl?: string;
}

export interface FundAllocation extends BaseEntity {
  amount: number;
  allocationDate: string; // ISO date string
  goal: string;
  source: string;
  status: 'planned' | 'completed';
  allocatedById: string;
  siteId?: string;
  smallGroupId?: string;
  notes?: string;
  // Enriched data for UI
  allocatedByName?: string;
  siteName?: string;
  smallGroupName?: string;
}

export interface Financials {
  income: number;
  expenses: number;
  netBalance: number;
  totalAllocated: number;
  totalSpent: number;
  allocationBalance: number;
  transactions: FinancialTransaction[];
  allocations: FundAllocation[];
  reports: Report[];
}

// =============================================================================
// UI & NAVIGATION TYPES
// =============================================================================

export interface DateFilter {
  from: Date;
  to: Date;
  rangeKey?: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
  isChidren?: boolean;
  children?: NavItem[];
  allowedRoles?: UserRole[];
}

// =============================================================================
// FORM DATA & SERVICE TYPES
// =============================================================================

export interface ReportFormData {
  activityId: string; // The ID of the planned activity this report is for
  title: string;
  activityDate: string;
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  activityTypeId: string;
  thematic: string;
  speaker?: string;
  moderator?: string;
  girlsCount?: number;
  boysCount?: number;
  participantsCountReported?: number;
  totalExpenses?: number;
  currency?: string;
  content: string;
  images?: Array<{ name: string; url: string }>;
  financialSummary?: string;
  status: ReportStatus;
  reviewNotes?: string;
  attachments?: string[];
  submittedBy: string; // Should be set to the current user's ID
}

export interface TransactionFormData {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  siteId?: string;
  smallGroupId?: string;
  relatedReportId?: string;
  relatedActivityId?: string;
  status?: string;
  proofUrl?: string;
  attachments?: string[];
  recordedById: string; // Set to current user's ID
}

export interface FundAllocationFormData {
  amount: number;
  allocationDate: string; // ISO date string
  goal: string;
  source: string;
  status: 'planned' | 'completed';
  allocatedById: string; // Set to current user's ID
  siteId?: string;
  smallGroupId?: string;
  notes?: string;
}

export type SiteFormData = Omit<Site, 'id' | 'coordinator' | 'memberCount' | 'smallGroupCount'>;


export interface SmallGroupFormData {
  name: string;
  leaderId?: string | null;
  logisticsAssistantId?: string | null;
  financeAssistantId?: string | null;
  meetingDay?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  meetingTime?: string;
  meetingLocation?: string;
}

export type MemberFormData = {
  name: string;
  gender: 'male' | 'female';
  phone?: string;
  email?: string;
  type: 'student' | 'non-student';
  joinDate: Date;
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
};

export type LoginCredentials = {
  email: string;
  password?: string;
};

export interface UserContext {
  user: User | null;
  role: UserRole | null;
}

export interface AuthContextType {
  currentUser: User | null;
  session: any | null;
  isLoading: boolean;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
  details?: any;
}
