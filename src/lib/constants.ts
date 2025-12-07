import type { NavItem, UserRole } from "@/lib/types";
import { LayoutDashboard, Activity, Users, FileText, Lightbulb, Building, Settings, UsersRound, Briefcase, Award, UserCircle as UserProfileIcon, History as HistoryIcon, Bell } from "lucide-react";

export const ROLES: Record<string, UserRole> = {
  NATIONAL_COORDINATOR: "national_coordinator",
  SITE_COORDINATOR: "site_coordinator",
  SMALL_GROUP_LEADER: "small_group_leader",
  MEMBER: "member",
};

export const NAVIGATION_LINKS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Navigation.dashboard",
    icon: LayoutDashboard,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/notifications",
    label: "Navigation.notifications",
    icon: Bell,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/activities",
    label: "Navigation.activities",
    icon: Activity,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
    dataTour: "activities",
  },
  {
    href: "/dashboard/members",
    label: "Navigation.members",
    icon: Users,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
    dataTour: "members",
  },
  {
    label: "Navigation.reports",
    icon: FileText,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
    href: "/dashboard/reports/view",
    dataTour: "reports",
    children: [
      {
        href: "/dashboard/reports/submit",
        label: "Common.create", // Using Common.create or specific key if exists
        icon: FileText,
        allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
        dataTour: "submit-report",
      },
      {
        href: "/dashboard/reports/view",
        label: "Common.search", // Or specific key
        icon: FileText,
        allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],

      },
      {
        href: "/dashboard/reports/monthly",
        label: "Navigation.monthly_reports",
        icon: FileText,
        allowedRoles: [ROLES.NATIONAL_COORDINATOR],
      },
    ],
  },
  {
    href: "/dashboard/suggestions",
    label: "Navigation.ai_suggestions",
    icon: Lightbulb,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/sites",
    label: "Navigation.sites", // More neutral label - NC sees all, SC sees their own
    icon: Building,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR], // Site coordinators might see their own site details
    dataTour: "create-site",
  },
  {
    href: "/dashboard/users",
    label: "Navigation.manage_users",
    icon: UsersRound,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
  },
  {
    href: "/dashboard/history/coordinators",
    label: "Navigation.history",
    icon: HistoryIcon,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
  },
  {
    href: "/dashboard/invitations",
    label: "Navigation.invitations",
    icon: UsersRound,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
    dataTour: "invite-user",
  },
  {
    href: "/dashboard/finances",
    label: "Navigation.finance",
    icon: Briefcase,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
    dataTour: "finances",
  },
  {
    href: "/dashboard/certificates",
    label: "Navigation.certificates",
    icon: Award,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
  },
  {
    href: "/dashboard/my-certificates",
    label: "Navigation.my_certificates",
    icon: Award,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/settings/profile",
    label: "Navigation.my_profile",
    dataTour: "profile",
    icon: UserProfileIcon, // Changed from Settings icon for clarity
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  }
];

export const APP_NAME = "AYLF Small Group Tracker";
