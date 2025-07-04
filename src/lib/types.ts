import { LucideIcon } from "lucide-react";

// =============================================================================
// BASE & CORE TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
}

export type UserRole = 'national_coordinator' | 'site_coordinator' | 'small_group_leader' | 'member';

// Used for create/update forms
export interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  siteId?: string;
  smallGroupId?: string;
  mandateStartDate?: Date;
  mandateEndDate?: Date;
  phone?: string;
  profilePicture?: string;
}

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
  expenses?: number;
  currency?: string;
  content: string;
  images?: Array<{ name: string; url: string }>;
  financialSummary?: string;
  status: ReportStatus;
  reviewNotes?: string;
  attachments?: string[];
}

export interface FinancialTransaction extends BaseEntity {
  type: 'income' | 'expense';
  category: 'offering' | 'donation' | 'project' | 'operations' | 'other';
  amount: number;
  date: string; // ISO date string
  description: string;
  siteId?: string;
  smallGroupId?: string;
  recordedBy: string; // User ID
}

export interface FundAllocation extends BaseEntity {
  amount: number;
  allocationDate: string; // ISO date string
  description?: string;
  senderId: string;
  senderType: 'national' | 'site';
  recipientId: string;
  recipientType: 'site' | 'smallGroup';
  createdById?: string; // User ID of the creator
}

// =============================================================================
// UI & NAVIGATION TYPES
// =============================================================================

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

export interface FundAllocationFormData {
  amount: number;
  description?: string;
  recipientId: string;
  recipientType: 'site' | 'smallGroup';
}

export type LoginCredentials = {
  email: string;
  password?: string;
};

export interface AuthContextType {
  session: { user: User | null; loading: boolean };
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}


