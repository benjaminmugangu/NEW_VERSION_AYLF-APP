import { LucideIcon } from "lucide-react";

// =============================================================================
// BASE & CORE TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
}

export type UserRole = 'national_coordinator' | 'site_coordinator' | 'small_group_leader' | 'member';

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  siteId?: string;
  smallGroupId?: string;
  profilePicture?: string;
  mandateStartDate?: string; 
  mandateEndDate?: string;   
  status?: "active" | "inactive";
  // Enriched data from services
  siteName?: string;
  smallGroupName?: string;
}

export interface Site extends BaseEntity {
  name: string;
  city: string;
  country: string;
  creationDate: string; // ISO 8601 date string
  coordinatorId: string;
  coordinator?: User; // Enriched data
  memberCount?: number; // Enriched data
  smallGroupCount?: number; // Enriched data
}

export interface SmallGroup extends BaseEntity {
  name: string;
  siteId: string;
  leaderId?: string;
  logisticsAssistantId?: string;
  financeAssistantId?: string;
  meetingDay?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
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

export interface Member extends BaseEntity {
  userId?: string; // Optional link to a User account
  name: string;
  gender: 'Male' | 'Female';
  type: 'student' | 'non-student';
  joinDate: string; // ISO 8601 date string
  phone?: string;
  email?: string;
  siteId: string;
  smallGroupId?: string;
}

// Enriched Member type for UI display
export type MemberWithDetails = Member & {
  siteName: string;
  smallGroupName: string;
};

// =============================================================================
// FEATURE-SPECIFIC TYPES
// =============================================================================

export interface Activity extends BaseEntity {
  name: string;
  description: string;
  date: string; // ISO date string
  status: "planned" | "executed" | "cancelled";
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  participantsCount?: number;
  imageUrl?: string;
  activityTypeId?: string; // Foreign key to activity_types table
  createdBy?: string; // UUID of the user who created the activity
  deleted_at?: string; // For soft delete
  // Enriched data for UI
  siteName?: string;
  smallGroupName?: string;
  activityTypeName?: string;
}

export interface ActivityType {
  id: string;
  name: string;
  category: 'spiritual' | 'outreach' | 'community' | 'training';
  description?: string;
}

export type ReportStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

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
};

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
  relatedReportId?: string;
  relatedReportTitle?: string;
  attachments?: string[];
}

export interface FundAllocation extends BaseEntity {
  amount: number;
  allocationDate: string; // ISO date string
  goal: string;
  source: string;
  status: 'planned' | 'completed' | 'cancelled';
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
  totalRevenue: number;
  totalExpenses: number;
  totalAllocated: number;
  netBalance: number;
  allocations: FundAllocation[];
  reports: Report[];
  transactions: FinancialTransaction[];
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
  attachments?: string[];
  recordedById: string; // Set to current user's ID
}

export interface FundAllocationFormData {
  amount: number;
  allocationDate: string; // ISO date string
  goal: string;
  source: string;
  status: 'planned' | 'completed' | 'cancelled';
  allocatedById: string; // Set to current user's ID
  siteId?: string;
  smallGroupId?: string;
  notes?: string;
}

export type SiteFormData = Omit<Site, 'id' | 'coordinator' | 'memberCount' | 'smallGroupCount'>;

export interface ActivityFormData {
  name: string;
  description: string;
  date: string; // ISO date string
  status: "planned" | "executed" | "cancelled";
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  participantsCount?: number;
  imageUrl?: string;
  activityTypeId?: string;
  createdBy: string; // Must be set to the current user's ID
}

export interface SmallGroupFormData {
  name: string;
  leaderId?: string;
  logisticsAssistantId?: string;
  financeAssistantId?: string;
  meetingDay?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  meetingTime?: string;
  meetingLocation?: string;
}

export type MemberFormData = {
  name: string;
  type: 'student' | 'non-student';
  joinDate: Date;
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
  session: import('@supabase/supabase-js').Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error: string | null }>;
  logout: () => Promise<void>;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
  details?: any;
}


