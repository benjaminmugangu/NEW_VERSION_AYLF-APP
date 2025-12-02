import type { NavItem, UserRole } from "@/lib/types";
import { LayoutDashboard, Activity, Users, FileText, Lightbulb, Building, Settings, UsersRound, Briefcase, Award, UserCircle as UserProfileIcon, History as HistoryIcon } from "lucide-react";

export const ROLES: Record<string, UserRole> = {
  NATIONAL_COORDINATOR: "national_coordinator",
  SITE_COORDINATOR: "site_coordinator",
  SMALL_GROUP_LEADER: "small_group_leader",
  MEMBER: "member",
};

export const NAVIGATION_LINKS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/activities",
    label: "Activities",
    icon: Activity,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/members",
    label: "Members",
    icon: Users,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    label: "Reports",
    icon: FileText,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
    href: "/dashboard/reports/view", // Main href for parent item, can be first child's href or a dedicated overview
    children: [
      {
        href: "/dashboard/reports/submit",
        label: "Submit Report",
        icon: FileText,
        allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
      },
      {
        href: "/dashboard/reports/view",
        label: "View Reports",
        icon: FileText,
        allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
      },
    ],
  },
  {
    href: "/dashboard/suggestions",
    label: "AI Suggestions",
    icon: Lightbulb,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/sites",
    label: "Sites", // More neutral label - NC sees all, SC sees their own
    icon: Building,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR], // Site coordinators might see their own site details
  },
  {
    href: "/dashboard/users",
    label: "Manage Users",
    icon: UsersRound,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
  },
  {
    href: "/dashboard/history/coordinators",
    label: "History",
    icon: HistoryIcon,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
  },
  {
    href: "/dashboard/invitations",
    label: "Invitations",
    icon: UsersRound,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
  },
  {
    href: "/dashboard/finances",
    label: "Finances",
    icon: Briefcase,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  },
  {
    href: "/dashboard/certificates",
    label: "Certificates",
    icon: Award,
    allowedRoles: [ROLES.NATIONAL_COORDINATOR],
  },
  {
    href: "/dashboard/settings/profile",
    label: "My Profile",
    icon: UserProfileIcon, // Changed from Settings icon for clarity
    allowedRoles: [ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER],
  }
];

export const APP_NAME = "AYLF Small Group Tracker";
