export type Role = "national_coordinator" | "site_coordinator" | "small_group_leader" | "guest";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  siteId?: string;
  smallGroupId?: string;
  mandateStartDate?: string; // ISO date string
  mandateEndDate?: string;   // ISO date string, if ended
  status?: "active" | "inactive"; // Added for user management
}

export interface Site {
  id: string;
  name:string;
  coordinatorId?: string; // Current coordinator - made optional for creation
}

export interface SmallGroup {
  id: string;
  name: string;
  siteId: string;
  leaderId?: string; // Current leader - made optional for creation
  logisticsAssistantId?: string; // New: For logistics assistant
  financeAssistantId?: string; // New: For finance assistant
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  date: string; // ISO date string
  status: "planned" | "executed" | "cancelled";
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  participantsCount?: number; // Expected or actual participants if directly tied to activity record
  imageUrl?: string; 
}

export interface Member {
  id: string;
  name: string;
  type: "student" | "non-student";
  siteId?: string;
  smallGroupId?: string;
  joinDate: string; // ISO date string
  date?: string; // For consistency with date filtering helper
}

export type ReportStatus = "submitted" | "approved" | "rejected";

export interface Report {
  id: string;
  title: string;
  activityDate: string; // Date of the activity itself
  submittedBy: string; // User ID
  submissionDate: string; // ISO date string
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  activityType: string; // e.g., "Small Group Meeting", "Workshop", "Conference"
  thematic: string;
  speaker?: string; 
  moderator?: string;
  girlsCount?: number;
  boysCount?: number;
  participantsCountReported?: number; // Derived from girlsCount + boysCount for this specific report
  amountUsed?: number;
  currency?: string; // e.g., "USD", "CDF"
  content: string; // Main narrative/description of the report
  images?: Array<{ name: string; url: string }>; 
  financialSummary?: string; // Optional: for more detailed financial notes beyond amountUsed
  status: ReportStatus;
  reviewNotes?: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: Role[];
  children?: NavItem[];
  filterKey?: string; 
  filterValue?: string;
}

export interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  href?: string;
  filterKey?: string; 
  filterValue?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO date string
  amount: number; // Always positive
  description: string;
  transactionType: 'transfer' | 'expense' | 'income_source'; 
  
  senderEntityType: 'national' | 'site' | 'small_group' | 'external_donor';
  senderEntityId: string; 
  senderEntityName?: string; 

  recipientEntityType: 'national' | 'site' | 'small_group' | 'vendor' | 'beneficiary' | 'other';
  recipientEntityId: string; 
  recipientEntityName?: string;

  level: 'national' | 'site' | 'small_group'; 
  relatedSiteId?: string; 
  relatedSmallGroupId?: string; 
}

// FormData Types
export interface ActivityFormData {
  name: string;
  description: string;
  date: Date;
  status: "planned" | "executed" | "cancelled";
  level: "national" | "site" | "small_group";
  siteId?: string;
  smallGroupId?: string;
  participantsCount?: number;
  imageUrl?: string;
}

export interface MemberFormData {
  name: string;
  type: "student" | "non-student";
  siteId?: string;
  smallGroupId?: string;
  joinDate: Date;
}

export interface UserFormData {
  name: string;
  email: string;
  role: Role;
  siteId?: string;
  smallGroupId?: string;
  mandateStartDate?: Date;
  mandateEndDate?: Date;
  status?: "active" | "inactive";
}

export interface TransactionFormData {
  date: Date;
  amount: number;
  description: string;
  transactionType: 'transfer' | 'expense' | 'income_source';
  senderEntityType: 'national' | 'site' | 'small_group' | 'external_donor';
  senderEntityId: string;
  senderEntityName?: string;
  recipientEntityType: 'national' | 'site' | 'small_group' | 'vendor' | 'beneficiary' | 'other';
  recipientEntityId: string;
  recipientEntityName?: string;
  level: 'national' | 'site' | 'small_group'; // Usually determined by context or selected
  relatedSiteId?: string;
  relatedSmallGroupId?: string;
}

export interface SiteFormData {
  name: string;
  coordinatorId?: string;
}

// Update SmallGroupFormData to include assistant IDs
export interface SmallGroupFormData {
  name: string;
  leaderId?: string;
  logisticsAssistantId?: string;
  financeAssistantId?: string;
}
