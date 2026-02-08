import { LucideIcon } from "lucide-react";

// =============================================================================
// BASE & CORE TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
}

export type UserRole = 'NATIONAL_COORDINATOR' | 'SITE_COORDINATOR' | 'SMALL_GROUP_LEADER' | 'MEMBER';

// DbUser removed - use Profile from @prisma/client

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
  status?: 'active' | 'inactive' | 'invited';

  // Enriched data for UI
  siteName?: string;
  smallGroupName?: string;
  avatarUrl?: string;

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

// DbSmallGroup removed - use SmallGroup from @prisma/client

// Type aliases for common unions (SonarLint fix)
export type Gender = 'male' | 'female';
export type MemberType = 'student' | 'non-student';
export type EntityLevel = "national" | "site" | "small_group";

export interface Member extends BaseEntity {
  userId?: string; // Optional link to a User account
  name: string;
  gender: Gender;
  type: MemberType;
  joinDate: string; // ISO 8601 date string
  phone?: string;
  email?: string;
  level: EntityLevel;
  siteId?: string;
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
  level: EntityLevel;
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

// DbActivity removed - use Activity from @prisma/client

export interface ActivityType {
  id: string;
  name: string;
  category: 'spiritual' | 'outreach' | 'community' | 'training';
  description?: string;
}

export type ReportStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

// DbReport removed - use Report from @prisma/client

export interface Report extends BaseEntity {
  title: string;
  activityDate: string;
  submittedBy: string; // User ID
  submissionDate: string; // ISO date string
  level: EntityLevel;
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
  rejectionReason?: string; // Reason for rejection (displayed to submitter)
  attachments?: string[];
  // Enriched data for UI
  submittedByName?: string;
  siteName?: string;
  smallGroupName?: string;
  activityTypeName?: string;
  submittedByAvatarUrl?: string;
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
  recordedByAvatarUrl?: string;
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
  isSystemGenerated?: boolean;
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
  // Hybrid allocation support
  allocationType: 'hierarchical' | 'direct';
  bypassReason?: string; // Required when allocationType = 'direct'
  // Enriched data for UI
  allocatedByName?: string;
  allocatedByAvatarUrl?: string;
  siteName?: string;
  smallGroupName?: string;
  fromSiteId?: string;
  fromSiteName?: string;
  proofUrl?: string;
}

export interface AnnualBudget extends BaseEntity {
  year: number;
  totalAmount: number;
  currency: string;
  status: 'active' | 'closed';
  description?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
export interface FundAllocationFormData {
  amount: number;
  allocationDate: string; // ISO date string
  goal: string;
  source: string;
  status: 'planned' | 'completed';
  allocatedById: string;
  siteId?: string;
  smallGroupId?: string;
  notes?: string;
  fromSiteId?: string;
  fromSiteName?: string;
  proofUrl?: string;
  // Hybrid allocation support
  isDirect?: boolean; // UI flag to toggle direct allocation mode
  allocationType?: 'hierarchical' | 'direct'; // Internal/Audit field
  bypassReason?: string; // Required when isDirect = true
  idempotencyKey?: string;
}

export interface AnnualBudgetFormData {
  year: number;
  totalAmount: number;
  currency?: string;
  description?: string;
  status?: 'active' | 'closed';
}

export interface Financials {
  income: number;
  expenses: number;
  netBalance: number;
  totalAllocated: number;
  totalSpent: number;
  allocationBalance: number;
  directGroupInjections?: number;
  transactions: FinancialTransaction[];

  allocations: FundAllocation[];
  reports: Report[];
  // New metrics for Hybrid Allocation reporting
  directAllocationsTotal?: number;
  hierarchicalAllocationsTotal?: number;
  recentActivity?: any[]; // Unified activity stream

  // Strategic "Triple Truth" metrics
  centralReserve?: number;
  fieldFloat?: number;
  annualBudget?: number;
  totalGlobalExpenses?: number;
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
  dataTour?: string; // For onboarding tour targeting
  badge?: string | number;
}

// =============================================================================
// FORM DATA & SERVICE TYPES
// =============================================================================

export interface ReportFormData {
  activityId: string; // The ID of the planned activity this report is for
  title: string;
  activityDate: string;
  level: EntityLevel;
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
  idempotencyKey?: string;
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
  idempotencyKey?: string;
}

// Duplicate FundAllocationFormData removed. Using definition at line 292.

export type SiteFormData = Omit<Site, 'id' | 'coordinator' | 'memberCount' | 'smallGroupCount'>;


export interface SmallGroupFormData {
  name: string;
  siteId?: string; // Added to fix type error
  leaderId?: string | null;
  logisticsAssistantId?: string | null;
  financeAssistantId?: string | null;
  meetingDay?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  meetingTime?: string;
  meetingLocation?: string;
}

export type MemberFormData = {
  name: string;
  gender: Gender;
  type: MemberType;
  joinDate: Date;
  phone?: string;
  email?: string;
  level: EntityLevel; // Added level
  siteId?: string; // Made optional to match schema conditional logic
  smallGroupId?: string; // Already optional
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
  session: unknown; // SonarLint: 'unknown' covers null
  isLoading: boolean;
}

// =============================================================================
// SERVICE & ERROR HANDLING
// =============================================================================

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PERIOD_CLOSED = 'PERIOD_CLOSED',
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: ErrorCode | string;
  };
}
