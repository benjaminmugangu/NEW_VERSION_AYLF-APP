// src/lib/mockData.ts
import type { User, Activity, Member, Report, Site, SmallGroup, FundAllocation, ActivityType } from "@/lib/types";
import { ROLES } from "@/lib/constants";
import { getYear, subYears, formatISO, startOfYear, endOfYear } from 'date-fns';

const currentYear = getYear(new Date());
const lastYear = currentYear - 1;

export const mockActivityTypes: ActivityType[] = [
  { id: "type_1", name: "Causerie Morale", category: 'spiritual' },
  { id: "type_2", name: "Conférence", category: 'training' },
  { id: "type_3", name: "Formation", category: 'training' },
  { id: "type_4", name: "Activité Sportive", category: 'community' },
  { id: "type_5", name: "Service Communautaire", category: 'community' },
  { id: "type_6", name: "Levée de Fonds", category: 'outreach' },
  { id: "type_7", name: "Réunion de Prière", category: 'spiritual' },
  { id: "type_8", name: "Autre", category: 'community' },
];

export const mockUsers: User[] = [
  // National Coordinators
  { id: "user_famba", name: "FAMBA SAGESSE", email: "famba.sagesse@aylf.org", role: ROLES.NATIONAL_COORDINATOR, mandateStartDate: "2019-01-01", status: "active" },
  { id: "user_clarisse", name: "CLARISSE", email: "clarisse.adj@aylf.org", role: ROLES.NATIONAL_COORDINATOR, mandateStartDate: "2021-01-01", status: "active" },
  
  // Site Coordinators - names are now more specific and IDs are unique
  { id: "user_coord_beni_john", name: "John BeniCoordinator", email: "john.beni@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_beni", mandateStartDate: "2022-01-01", status: "active" },
  { id: "user_coord_bukavu_jane", name: "Jane BukavuCoordinator", email: "jane.bukavu@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_bukavu", mandateStartDate: "2021-06-15", status: "active" },
  { id: "user_coord_bunia_paul", name: "Paul BuniaCoordinator", email: "paul.bunia@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_bunia", mandateStartDate: "2022-02-10", mandateEndDate: `${currentYear}-01-10`, status: "inactive" },
  { id: "user_coord_butembo_peter", name: "Peter ButemboCoordinator", email: "peter.butembo@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_butembo", mandateStartDate: "2023-01-20", status: "active" },
  { id: "user_coord_goma_grace", name: "Grace GomaCoordinator", email: "grace.goma@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_goma", mandateStartDate: "2020-11-01", status: "active" },
  { id: "user_coord_kalemie_kevin", name: "Kevin KalemieCoordinator", email: "kevin.kalemie@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_kalemie", mandateStartDate: "2023-05-01", status: "active" },
  { id: "user_coord_kinshasa_karen", name: "Karen KinshasaCoordinator", email: "karen.kinshasa@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_kinshasa", mandateStartDate: "2019-09-01", status: "active" },
  { id: "user_coord_lubumbashi_leo", name: "Leo LubumbashiCoordinator", email: "leo.lubumbashi@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_lubumbashi", mandateStartDate: "2020-05-05", status: "active" },
  { id: "user_coord_uvira_ursula", name: "Ursula UviraCoordinator", email: "ursula.uvira@aylf.org", role: ROLES.SITE_COORDINATOR, siteId: "site_uvira", mandateStartDate: "2022-10-01", status: "active" },

  // Small Group Leaders - ensure IDs and assignments are consistent
  { id: "user_leader_beni_alumni_anna", name: "Anna BeniAlumniLeader", email: "anna.beni.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_beni", smallGroupId: "sg_beni_alumni", mandateStartDate: formatISO(startOfYear(subYears(new Date(),1))), mandateEndDate: formatISO(endOfYear(subYears(new Date(),1))), status: "inactive" },
  { id: "user_leader_bukavu_alumni_bob", name: "Bob BukavuAlumniLeader", email: "bob.bukavu.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_bukavu", smallGroupId: "sg_bukavu_alumni", mandateStartDate: "2021-08-01", status: "active" },
  { id: "user_leader_bunia_alumni_ben", name: "Ben BuniaAlumniLeader", email: "ben.bunia.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_bunia", smallGroupId: "sg_bunia_alumni", mandateStartDate: "2022-04-01", mandateEndDate: `${lastYear}-05-15`, status: "inactive" },
  { id: "user_leader_butembo_alumni_beth", name: "Beth ButemboAlumniLeader", email: "beth.butembo.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_butembo", smallGroupId: "sg_butembo_alumni", mandateStartDate: "2023-03-15", status: "active" },
  { id: "user_leader_goma_alumni_greg", name: "Greg GomaAlumniLeader", email: "greg.goma.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_goma", smallGroupId: "sg_goma_alumni", mandateStartDate: "2020-12-01", mandateEndDate: `${currentYear}-03-01`, status: "inactive" },
  { id: "user_leader_kalemie_alumni_ken", name: "Ken KalemieAlumniLeader", email: "ken.kalemie.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_kalemie", smallGroupId: "sg_kalemie_alumni", mandateStartDate: "2023-06-10", status: "active" },
  { id: "user_leader_kinshasa_alumni_kate", name: "Kate KinshasaAlumniLeader", email: "kate.kinshasa.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_kinshasa", smallGroupId: "sg_kinshasa_alumni", mandateStartDate: "2019-10-15", status: "active" },
  { id: "user_leader_lubumbashi_alumni_liam", name: "Liam LubumbashiAlumniLeader", email: "liam.lubumbashi.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_lubumbashi", smallGroupId: "sg_lubumbashi_alumni", mandateStartDate: "2020-06-25", status: "active" },
  { id: "user_leader_uvira_alumni_uma", name: "Uma UviraAlumniLeader", email: "uma.uvira.alumni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_uvira", smallGroupId: "sg_uvira_alumni", mandateStartDate: "2022-11-11", mandateEndDate: `${lastYear}-12-31`, status: "inactive" },
  
  // Other SG Leaders for non-alumni groups
  { id: "user_leader_beni_isc_temp", name: "Leader ISC Beni", email: "leader.isc.beni@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_beni", smallGroupId: "sg_beni_isc", mandateStartDate: "2023-01-01", status: "active" },
  { id: "user_leader_goma_ulpgl_david", name: "David Ushindi", email: "david.ushindi.goma@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_goma", smallGroupId: "sg_goma_ulpgl", mandateStartDate: "2024-01-01", status: "active" },

  // Example Assistant Leaders
  { id: "user_log_beni_alumni_marc", name: "Marc BeniLogistics", email: "marc.beni.log@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_beni", smallGroupId: "sg_beni_alumni", mandateStartDate: "2023-01-01", status: "active" },
  { id: "user_fin_beni_alumni_sophie", name: "Sophie BeniFinance", email: "sophie.beni.fin@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_beni", smallGroupId: "sg_beni_alumni", mandateStartDate: "2023-01-01", status: "active" },
  { id: "user_log_goma_ulpgl_luc", name: "Luc GomaLogistics", email: "luc.goma.log@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_goma", smallGroupId: "sg_goma_ulpgl", mandateStartDate: "2024-01-01", status: "active" },
  { id: "user_fin_goma_ulpgl_fatou", name: "Fatou GomaFinance", email: "fatou.goma.fin@aylf.org", role: ROLES.SMALL_GROUP_LEADER, siteId: "site_goma", smallGroupId: "sg_goma_ulpgl", mandateStartDate: "2024-01-01", status: "active" },

  // Generic Assistants for SGs
  { id: "user_log_generic_1", name: "Logi Assistant One", email: "logi.one@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_fin_generic_1", name: "Fina Assistant One", email: "fina.one@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_log_generic_2", name: "Logi Assistant Two", email: "logi.two@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_fin_generic_2", name: "Fina Assistant Two", email: "fina.two@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_log_generic_3", name: "Logi Assist Three", email: "logi.three@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_fin_generic_3", name: "Fina Assist Three", email: "fina.three@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_log_generic_4", name: "Logi Assist Four", email: "logi.four@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_fin_generic_4", name: "Fina Assist Four", email: "fina.four@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_log_generic_5", name: "Logi Assist Five", email: "logi.five@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_fin_generic_5", name: "Fina Assist Five", email: "fina.five@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_log_generic_6", name: "Logi Assist Six", email: "logi.six@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
  { id: "user_fin_generic_6", name: "Fina Assist Six", email: "fina.six@aylf.org", role: ROLES.SMALL_GROUP_LEADER, status: "active" },
];

export const mockSites: Site[] = [
  { id: "site_beni", name: "Beni", coordinatorId: "user_coord_beni_john", memberCount: 3, smallGroupCount: 5 },
  { id: "site_bukavu", name: "Bukavu", coordinatorId: "user_coord_bukavu_jane", memberCount: 2, smallGroupCount: 7 },
  { id: "site_bunia", name: "Bunia", coordinatorId: "user_coord_bunia_paul", memberCount: 0, smallGroupCount: 3 }, 
  { id: "site_butembo", name: "Butembo", coordinatorId: "user_coord_butembo_peter", memberCount: 0, smallGroupCount: 4 },
  { id: "site_goma", name: "Goma", coordinatorId: "user_coord_goma_grace", memberCount: 2, smallGroupCount: 6 },
  { id: "site_kalemie", name: "Kalemie", coordinatorId: "user_coord_kalemie_kevin", memberCount: 0, smallGroupCount: 5 },
  { id: "site_kinshasa", name: "Kinshasa", coordinatorId: "user_coord_kinshasa_karen", memberCount: 1, smallGroupCount: 3 },
  { id: "site_lubumbashi", name: "Lubumbashi", coordinatorId: "user_coord_lubumbashi_leo", memberCount: 1, smallGroupCount: 2 },
  { id: "site_uvira", name: "Uvira", coordinatorId: "user_coord_uvira_ursula", memberCount: 0, smallGroupCount: 6 },
];

export const mockSmallGroups: SmallGroup[] = [
  // Beni
  { id: "sg_beni_alumni", name: "ALUMNI", siteId: "site_beni", leaderId: "user_leader_beni_alumni_anna", logisticsAssistantId: "user_log_beni_alumni_marc", financeAssistantId: "user_fin_beni_alumni_sophie", meetingDay: "Wednesday", meetingTime: "17:30", meetingLocation: "UCBC Campus" }, 
  { id: "sg_beni_isc", name: "ISC", siteId: "site_beni", leaderId: "user_leader_beni_isc_temp", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1", meetingDay: "Friday", meetingTime: "16:00", meetingLocation: "ISC Hall" }, 
  { id: "sg_beni_uac", name: "UAC", siteId: "site_beni", leaderId: "user_coord_beni_john", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2", meetingDay: "Tuesday", meetingTime: "18:00", meetingLocation: "UAC Auditorium" },
  { id: "sg_beni_ucbc", name: "UCBC", siteId: "site_beni", leaderId: "user_coord_beni_john", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3", meetingDay: "Thursday", meetingTime: "19:00", meetingLocation: "UCBC Library" },
  { id: "sg_beni_uos", name: "UOS", siteId: "site_beni", leaderId: "user_coord_beni_john", logisticsAssistantId: "user_log_generic_4", financeAssistantId: "user_fin_generic_4", meetingDay: "Monday", meetingTime: "17:00", meetingLocation: "UOS Hall" },
  // Bukavu
  { id: "sg_bukavu_alumni", name: "ALUMNI", siteId: "site_bukavu", leaderId: "user_leader_bukavu_alumni_bob", logisticsAssistantId: "user_log_generic_5", financeAssistantId: "user_fin_generic_5", meetingDay: "Wednesday", meetingTime: "17:30", meetingLocation: "UCB Campus" },
  { id: "sg_bukavu_isdr_fix", name: "ISDR", siteId: "site_bukavu", leaderId: "user_coord_bukavu_jane", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1", meetingDay: "Friday", meetingTime: "16:00", meetingLocation: "ISDR Hall" },
  { id: "sg_bukavu_isp_fix", name: "ISP", siteId: "site_bukavu", leaderId: "user_coord_bukavu_jane", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2", meetingDay: "Tuesday", meetingTime: "18:00", meetingLocation: "ISP Auditorium" },
  { id: "sg_bukavu_uea_fix", name: "UEA", siteId: "site_bukavu", leaderId: "user_coord_bukavu_jane", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3", meetingDay: "Thursday", meetingTime: "19:00", meetingLocation: "UEA Library" },
  { id: "sg_bukavu_isecof_fix", name: "ISECOF", siteId: "site_bukavu", leaderId: "user_coord_bukavu_jane", logisticsAssistantId: "user_log_generic_4", financeAssistantId: "user_fin_generic_4", meetingDay: "Monday", meetingTime: "17:00", meetingLocation: "ISECOF Hall" },
  { id: "sg_bukavu_uob_fix", name: "UOB", siteId: "site_bukavu", leaderId: "user_coord_bukavu_jane", logisticsAssistantId: "user_log_generic_5", financeAssistantId: "user_fin_generic_5", meetingDay: "Wednesday", meetingTime: "17:30", meetingLocation: "UOB Campus" },
  // Bunia
  { id: "sg_bunia_alumni", name: "ALUMNI", siteId: "site_bunia", leaderId: "user_leader_bunia_alumni_ben", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1" },
  { id: "sg_bunia_unibu", name: "UNIBU", siteId: "site_bunia", leaderId: "user_coord_bunia_paul", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2" }, 
  { id: "sg_bunia_unshalom", name: "UN.SHALOM", siteId: "site_bunia", leaderId: "user_coord_bunia_paul", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3" }, 
  // Butembo
  { id: "sg_butembo_alumni", name: "ALUMNI", siteId: "site_butembo", leaderId: "user_leader_butembo_alumni_beth", logisticsAssistantId: "user_log_generic_4", financeAssistantId: "user_fin_generic_4" },
  { id: "sg_butembo_uac", name: "UAC", siteId: "site_butembo", leaderId: "user_coord_butembo_peter", logisticsAssistantId: "user_log_generic_5", financeAssistantId: "user_fin_generic_5" },
  { id: "sg_butembo_ucg", name: "UCG", siteId: "site_butembo", leaderId: "user_coord_butembo_peter", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1" },
  { id: "sg_butembo_uor", name: "UOR", siteId: "site_butembo", leaderId: "user_coord_butembo_peter", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2" },
  // Goma
  { id: "sg_goma_alumni", name: "ALUMNI", siteId: "site_goma", leaderId: "user_leader_goma_alumni_greg", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3" },
  { id: "sg_goma_isig", name: "ISIG", siteId: "site_goma", leaderId: "user_coord_goma_grace", logisticsAssistantId: "user_log_generic_4", financeAssistantId: "user_fin_generic_4" },
  { id: "sg_goma_ucs", name: "UCS", siteId: "site_goma", leaderId: "user_coord_goma_grace", logisticsAssistantId: "user_log_generic_5", financeAssistantId: "user_fin_generic_5" },
  { id: "sg_goma_ulpgl", name: "ULPGL", siteId: "site_goma", leaderId: "user_leader_goma_ulpgl_david", logisticsAssistantId: "user_log_goma_ulpgl_luc", financeAssistantId: "user_fin_goma_ulpgl_fatou" },
  { id: "sg_goma_unigom", name: "UNIGOM", siteId: "site_goma", leaderId: "user_coord_goma_grace", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1" },
  { id: "sg_goma_unim", name: "UNIM", siteId: "site_goma", leaderId: "user_coord_goma_grace", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2" },
  // Kalemie
  { id: "sg_kalemie_alumni", name: "ALUMNI", siteId: "site_kalemie", leaderId: "user_leader_kalemie_alumni_ken", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3" },
  { id: "sg_kalemie_isp", name: "ISP", siteId: "site_kalemie", leaderId: "user_coord_kalemie_kevin", logisticsAssistantId: "user_log_generic_4", financeAssistantId: "user_fin_generic_4" },
  { id: "sg_kalemie_istm", name: "ISTM", siteId: "site_kalemie", leaderId: "user_coord_kalemie_kevin", logisticsAssistantId: "user_log_generic_5", financeAssistantId: "user_fin_generic_5" },
  { id: "sg_kalemie_isss", name: "ISSS", siteId: "site_kalemie", leaderId: "user_coord_kalemie_kevin", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1" },
  { id: "sg_kalemie_unikal", name: "UNIKAL", siteId: "site_kalemie", leaderId: "user_coord_kalemie_kevin", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2" },
  // Kinshasa
  { id: "sg_kinshasa_alumni", name: "ALUMNI", siteId: "site_kinshasa", leaderId: "user_leader_kinshasa_alumni_kate", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3" },
  { id: "sg_kinshasa_unikin", name: "UNIKIN", siteId: "site_kinshasa", leaderId: "user_coord_kinshasa_karen", logisticsAssistantId: "user_log_generic_4", financeAssistantId: "user_fin_generic_4" },
  { id: "sg_kinshasa_unimkin", name: "UNIM/Kin", siteId: "site_kinshasa", leaderId: "user_coord_kinshasa_karen", logisticsAssistantId: "user_log_generic_5", financeAssistantId: "user_fin_generic_5" },
  // Lubumbashi
  { id: "sg_lubumbashi_alumni", name: "ALUMNI", siteId: "site_lubumbashi", leaderId: "user_leader_lubumbashi_alumni_liam", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1" },
  { id: "sg_lubumbashi_unilu", name: "UNILU", siteId: "site_lubumbashi", leaderId: "user_coord_lubumbashi_leo", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2" },
  // Uvira
  { id: "sg_uvira_alumni", name: "ALUMNI", siteId: "site_uvira", leaderId: "user_leader_uvira_alumni_uma", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3" },
  { id: "sg_uvira_isc", name: "ISC", siteId: "site_uvira", leaderId: "user_coord_uvira_ursula", logisticsAssistantId: "user_log_generic_4", financeAssistantId: "user_fin_generic_4" },
  { id: "sg_uvira_isdr", name: "ISDR", siteId: "site_uvira", leaderId: "user_coord_uvira_ursula", logisticsAssistantId: "user_log_generic_5", financeAssistantId: "user_fin_generic_5" },
  { id: "sg_uvira_isp", name: "ISP", siteId: "site_uvira", leaderId: "user_coord_uvira_ursula", logisticsAssistantId: "user_log_generic_1", financeAssistantId: "user_fin_generic_1" },
  { id: "sg_uvira_istm", name: "ISTM", siteId: "site_uvira", leaderId: "user_coord_uvira_ursula", logisticsAssistantId: "user_log_generic_2", financeAssistantId: "user_fin_generic_2" },
  { id: "sg_uvira_undt", name: "UNDT", siteId: "site_uvira", leaderId: "user_coord_uvira_ursula", logisticsAssistantId: "user_log_generic_3", financeAssistantId: "user_fin_generic_3" },
  // Extra small groups for testing multiple assistants in one group
  { id: "sg_goma_isig_team_a", name: "ISIG Team A", siteId: "site_goma", leaderId: "user_log_generic_6", logisticsAssistantId: "user_fin_generic_6", financeAssistantId: "user_clarisse" },
  { id: "sg_beni_uac_team_b", name: "UAC Team B", siteId: "site_beni", leaderId: "user_famba", logisticsAssistantId: "user_leader_beni_isc_temp", financeAssistantId: "user_leader_beni_alumni_anna" },

];

export const mockActivities: Activity[] = [
  { id: "act_1", name: "Leadership Workshop", description: "National leadership training.", date: "2024-08-15", status: "planned", level: "national", participantsCount: 150, imageUrl: "https://picsum.photos/seed/leadershipconf/600/400" },
  { id: "act_2", name: "Community Outreach", description: "Beni site local community service.", date: "2024-07-20", status: "executed", level: "site", siteId: "site_beni", participantsCount: 45, imageUrl: "https://picsum.photos/seed/communityservice/600/400" },
  { id: "act_3", name: "Book Study: 'Purpose Driven Life'", description: "Beni Alumni Group weekly study.", date: "2024-07-28", status: "executed", level: "small_group", smallGroupId: "sg_beni_alumni", siteId: "site_beni", participantsCount: 12, imageUrl: "https://picsum.photos/seed/bookstudygroup/600/400" },
  { id: "act_4", name: "Mentorship Program Launch", description: "Bukavu site mentorship initiative.", date: "2024-09-01", status: "planned", level: "site", siteId: "site_bukavu", participantsCount: 60, imageUrl: "https://picsum.photos/seed/mentorshipprogram/600/400" },
  { id: "act_5", name: "Annual Youth Conference", description: "National gathering for all youth.", date: "2023-12-10", status: "executed", level: "national", participantsCount: 500, imageUrl: "https://picsum.photos/seed/youthconference/600/400" },
  { id: "act_6", name: "Sports Day", description: "Goma site inter-group sports event.", date: "2023-11-05", status: "executed", level: "site", siteId: "site_goma", participantsCount: 80, imageUrl: "https://picsum.photos/seed/sportsdayevent/600/400" },
  { id: "act_7", name: "Prayer Breakfast", description: "Kinshasa UNIKIN Group monthly meeting.", date: "2024-07-10", status: "cancelled", level: "small_group", smallGroupId: "sg_kinshasa_unikin", siteId: "site_kinshasa", participantsCount: 8 },
  { id: "act_8", name: "Bunia Site Evangelism Training", description: "Training for evangelism in Bunia.", date: "2024-08-10", status: "planned", level: "site", siteId: "site_bunia", participantsCount: 30, imageUrl: "https://picsum.photos/seed/evangelismtraining/600/400" },
  { id: "act_9", name: "Butembo UCG Bible Study", description: "Weekly bible study at UCG Butembo.", date: "2024-07-25", status: "executed", level: "small_group", smallGroupId: "sg_butembo_ucg", siteId: "site_butembo", participantsCount: 15, imageUrl: "https://picsum.photos/seed/biblestudycircle/600/400" },
  { id: "act_10", name: "Kalemie ISP Leadership Seminar", description: "Leadership seminar for ISP Kalemie students.", date: "2024-09-05", status: "planned", level: "small_group", smallGroupId: "sg_kalemie_isp", siteId: "site_kalemie", participantsCount: 25, imageUrl: "https://picsum.photos/seed/leadershipseminar/600/400" },
  { id: "act_13", name: "Lubumbashi UNILU Career Fair", description: "Career fair for UNILU students.", date: "2024-10-10", status: "planned", level: "small_group", smallGroupId: "sg_lubumbashi_unilu", siteId: "site_lubumbashi", participantsCount: 100, imageUrl: "https://picsum.photos/seed/careerfair/600/400" },
  { id: "act_14", name: "Uvira Community Cleanup", description: "Community cleanup organized by Uvira site.", date: "2024-08-20", status: "planned", level: "site", siteId: "site_uvira", participantsCount: 50, imageUrl: "https://picsum.photos/seed/communitycleanup/600/400" },
];

export const mockMembers: Member[] = [
  { id: "mem_1", name: "John Doe", gender: 'Male', type: "student", siteId: "site_beni", smallGroupId: "sg_beni_isc", joinDate: "2023-01-15" },
  { id: "mem_2", name: "Jane Smith", gender: 'Female', type: "non-student", siteId: "site_bukavu", smallGroupId: "sg_bukavu_alumni", joinDate: "2022-11-20" },
  { id: "mem_3", name: "Mike Brown", gender: 'Male', type: "student", siteId: "site_goma", smallGroupId: "sg_goma_isig", joinDate: "2023-03-10" },
  { id: "mem_4", name: "Sarah Wilson", gender: 'Female', type: "student", siteId: "site_uvira", smallGroupId: "sg_uvira_isp", joinDate: "2023-02-01" },
  { id: "mem_5", name: "David Lee", gender: 'Male', type: "non-student", siteId: "site_kinshasa", smallGroupId: "sg_kinshasa_alumni", joinDate: "2023-05-05" },
  { id: "mem_6", name: "Emily White", gender: 'Female', type: "student", siteId: "site_butembo", smallGroupId: "sg_butembo_uac", joinDate: "2024-01-10" },
  { id: "mem_7", name: "Chris Green", gender: 'Male', type: "student", siteId: "site_kalemie", smallGroupId: "sg_kalemie_unikal", joinDate: "2024-03-20" },
  { id: "mem_8", name: "Laura Blue", gender: 'Female', type: "student", siteId: "site_bunia", smallGroupId: "sg_bunia_unibu", joinDate: "2023-09-01" },
  { id: "mem_11", name: "Daniel Purple", gender: 'Male', type: "student", siteId: "site_lubumbashi", smallGroupId: "sg_lubumbashi_unilu", joinDate: "2024-02-20" },
  { id: "mem_12", name: "Grace Silver", gender: 'Female', type: "non-student", siteId: "site_beni", smallGroupId: "sg_beni_alumni", joinDate: "2021-10-10" },
  { id: "mem_13", name: "Tom Gold", gender: 'Male', type: "student", siteId: "site_goma", smallGroupId: "sg_goma_ulpgl", joinDate: "2023-08-12" },
];

export const mockReports: Report[] = [
  {
    id: "rep_sg_beni_alumni_1",
    title: "Réunion de planification Q3",
    activityDate: "2024-07-05",
    submittedBy: "user_leader_beni_alumni_anna",
    submissionDate: "2024-07-06",
    level: "small_group",
    siteId: "site_beni",
    smallGroupId: "sg_beni_alumni",
    activityTypeId: 'at-1',
    thematic: "Leadership",
    girlsCount: 5,
    boysCount: 7,
    participantsCountReported: 12,
    expenses: 50,
    currency: "USD",
    content: "Planification des activités du troisième trimestre, focus sur le développement du leadership.",
    status: "approved",
  },
  {
    id: "rep_1",
    title: "Q2 Leadership Workshop Summary",
    activityDate: "2024-06-28",
    submittedBy: "user_famba",
    submissionDate: "2024-07-01",
    level: "national",
    activityTypeId: 'at-2',
    thematic: "Strategic Planning and Conflict Resolution",
    speaker: "Dr. Jane Goodall (Guest)",
    moderator: "FAMBA SAGESSE",
    girlsCount: 60,
    boysCount: 90,
    participantsCountReported: 150,
    expenses: 500,
    currency: "USD",
    content: "The Q2 leadership workshop was a success with high engagement from all site coordinators. Key topics included strategic planning and conflict resolution. Breakout sessions were particularly fruitful.",
    images: [{ name: "workshop_group.jpg", url: "https://picsum.photos/seed/workshop1/400/300" }],
    financialSummary: "Total expenses: $500 for materials and speaker fees. Income from registration: $200.",
    status: "submitted",
  },
  {
    id: "rep_2",
    title: "July Community Outreach Report - Beni",
    activityDate: "2024-07-20",
    submittedBy: "user_coord_beni_john",
    submissionDate: "2024-07-22",
    level: "site",
    siteId: "site_beni",
    activityTypeId: 'at-3',
    thematic: "Supporting Local Families",
    moderator: "John BeniCoordinator",
    girlsCount: 20,
    boysCount: 15,
    participantsCountReported: 45,
    expenses: 250,
    currency: "USD",
    content: "Reached 50 families in the local area, distributed food packs and hygiene kits. Positive feedback received from community leaders. AYLF members involved: 10.",
    images: [
      { name: "outreach_team.jpg", url: "https://picsum.photos/seed/outreach1/400/300" },
      { name: "beneficiaries.jpg", url: "https://picsum.photos/seed/beneficiaries1/400/300" }
    ],
    financialSummary: "Donations received: $300. Expenses for supplies: $250. Net: $50 surplus.",
    status: "submitted",
  },
  {
    id: "rep_3",
    title: "Beni Alumni July Book Study Progress",
    activityDate: "2024-07-28",
    submittedBy: "user_leader_beni_alumni_anna",
    submissionDate: "2024-07-29",
    level: "small_group",
    smallGroupId: "sg_beni_alumni",
    siteId: "site_beni",
    activityTypeId: 'at-4',
    thematic: "Purpose Driven Life - Chapters 1-5",
    speaker: "N/A",
    moderator: "Anna BeniAlumniLeader",
    girlsCount: 5,
    boysCount: 7,
    participantsCountReported: 12,
    expenses: 5,
    currency: "USD",
    content: "Completed first 5 chapters of 'Purpose Driven Life'. Rich discussions on purpose, identity, and service. Average attendance: 12 members.",
    images: [{ name: "book_study.jpg", url: "https://picsum.photos/seed/bookstudy/400/300" }],
    financialSummary: "Refreshments cost $5, self-funded by members.",
    status: "submitted",
  },
  {
    id: "rep_4",
    title: "Goma Site Sports Day Recap",
    activityDate: "2023-11-05",
    submittedBy: "user_coord_goma_grace",
    submissionDate: "2023-11-10",
    level: "site",
    siteId: "site_goma",
    activityTypeId: 'at-5',
    thematic: "Teamwork and Fellowship",
    moderator: "Grace GomaCoordinator",
    participantsCountReported: 80,
    expenses: 150,
    currency: "USD",
    content: "Successful sports day with over 80 participants. ISIG group won the football tournament. Promoted teamwork and fellowship.",
    images: [{ name: "sports_day_goma.jpg", url: "https://picsum.photos/seed/sportsgoma/400/300" }],
    financialSummary: "Expenses for equipment and refreshments: $150. Covered by site budget.",
    status: "approved",
    reviewNotes: "Great event, well documented!"
  },
  {
    id: "rep_5",
    title: "Kinshasa UNIKIN Prayer Breakfast Outcome",
    activityDate: "2024-06-15",
    submittedBy: "user_leader_kinshasa_alumni_kate",
    submissionDate: "2024-06-18",
    level: "small_group",
    smallGroupId: "sg_kinshasa_unikin",
    siteId: "site_kinshasa",
    activityTypeId: 'at-4',
    thematic: "Prayer for Academic Success",
    speaker: "Pastor John Mark",
    moderator: "Local SG Leader",
    girlsCount: 8,
    boysCount: 7,
    participantsCountReported: 15,
    expenses: 30,
    currency: "USD",
    content: "Monthly prayer breakfast held with 15 students. Focus on academic success and spiritual growth. Event was well-received.",
    images: [{ name: "prayer_breakfast.jpg", url: "https://picsum.photos/seed/prayerbreakfast/400/300" }],
    financialSummary: "Cost for breakfast items: $30. Covered by member contributions.",
    status: "submitted",
  },
  {
    id: "rep_goma_ulpgl_1",
    title: "ULPGL SG Meeting Report - April 26",
    activityDate: "2025-04-26",
    submittedBy: "user_leader_goma_ulpgl_david",
    submissionDate: "2025-04-27",
    level: "small_group",
    smallGroupId: "sg_goma_ulpgl",
    siteId: "site_goma",
    activityTypeId: 'at-4',
    thematic: "Agir avec différence positive dans la bonté et l'humilité au sein d'une societé perverse",
    speaker: "Doyenne Facultaire Semerita Kamundu",
    moderator: "David Ushindi",
    girlsCount: 9,
    boysCount: 17,
    participantsCountReported: 26,
    expenses: 11,
    currency: "USD",
    content: "The small group meeting at ULPGL focused on maintaining positive values in a challenging society. Doyenne Semerita Kamundu shared valuable insights, and David Ushindi facilitated the discussion effectively. The session was interactive and well-attended.",
    images: [{ name: "ulpgl_meeting.jpg", url: "https://picsum.photos/seed/ulpglmeeting/400/300" }],
    financialSummary: "Amount used for refreshments and materials: $11.",
    status: "rejected",
    reviewNotes: "Please provide more details on the specific outcomes and action points from the discussion."
  }
];


export const historicalDataExample = `
Past Activities:
- Annual Youth Conference (Dec 2023): 500 attendees, feedback 4.5/5 stars. Topics: Leadership, Faith, Community. Resources: Guest speakers, workshops. Activity Type: Conference. Amount Used: $2000.
- Regional Sports Tournament (Oct 2023): 120 participants from 3 sites. Feedback 4.2/5. Resources: Sports equipment, volunteer referees. Activity Type: Sports Event. Amount Used: $300.
- Online Bible Study Series (Q1 2024): Avg 80 participants per session. Feedback 4.0/5. Resources: Zoom, study guides. Activity Type: Online Meeting. Amount Used: $50 (for premium Zoom).
- Site Beni - Mentorship Program (Ongoing): 30 mentor-mentee pairs. Feedback 4.8/5. Resources: Training materials for mentors. Activity Type: Program. Amount Used: $100 (materials).
- Small Group Beni Alumni - Local Charity Drive (May 2024): 15 members participated. Raised $200 for children's home. Activity Type: Community Service. Amount Used: $50 (transport).
`;

export const currentTrendsExample = `
Current Trends:
- Increased interest in mental health and well-being workshops (target 30-50 participants).
- Popularity of short-form video content for engagement and event promotion (e.g., TikTok challenges, Instagram Reels recap).
- Demand for hybrid events (online and in-person components), especially for larger trainings.
- Growing focus on practical skills development (e.g., coding, entrepreneurship, public speaking) - workshops of 20-40 people.
- Gamification in learning and team-building activities, suitable for small group meetings.
`;

export const groupPreferencesExample = `
Group Preferences (Optional):
- Target age group: 15-25 years.
- Interests: Spiritual growth, leadership development, community service, technology.
- Constraints: Limited budget for large-scale events (max $500 per event, preferably under $100 for SG activities). Preference for activities that can be replicated across different sites.
- Location: Primarily urban and peri-urban settings in Beni, Bukavu, Goma.
- Desired activity types: Workshops, Seminars, Small group discussions, Mentorship sessions.
`;



export const mockFundAllocations: FundAllocation[] = [
  // National to Site Allocations
  {
    id: 'alloc_nat_site_beni_q3_24',
    allocationDate: '2024-07-01',
    amount: 2000,
    senderId: 'aylf_national',
    senderType: 'national',
    recipientId: 'site_beni',
    recipientType: 'site',
    description: 'Q3 Budget for Site Beni',
  },
  {
    id: 'alloc_nat_site_bukavu_q3_24',
    allocationDate: '2024-07-01',
    amount: 1800,
    senderId: 'aylf_national',
    senderType: 'national',
    recipientId: 'site_bukavu',
    recipientType: 'site',
    description: 'Q3 Budget for Site Bukavu',
  },
  {
    id: 'alloc_nat_site_goma_q3_24',
    allocationDate: '2024-07-02',
    amount: 2200,
    senderId: 'aylf_national',
    senderType: 'national',
    recipientId: 'site_goma',
    recipientType: 'site',
    description: 'Special Project Funding Goma',
  },

  // Site to Small Group Allocations
  {
    id: 'alloc_site_beni_sg_alumni_jul_24',
    allocationDate: '2024-07-10',
    amount: 150,
    senderId: 'site_beni',
    senderType: 'site',
    recipientId: 'sg_beni_alumni',
    recipientType: 'smallGroup',
    description: 'Support for Alumni SG Activities',
  },
  {
    id: 'alloc_site_beni_sg_isc_jul_24',
    allocationDate: '2024-07-11',
    amount: 100,
    senderId: 'site_beni',
    senderType: 'site',
    recipientId: 'sg_beni_isc',
    recipientType: 'smallGroup',
    description: 'Materials for ISC SG workshop',
  },
  {
    id: 'alloc_site_bukavu_sg_uea_jul_24',
    allocationDate: '2024-07-12',
    amount: 200,
    senderId: 'site_bukavu',
    senderType: 'site',
    recipientId: 'sg_bukavu_uea',
    recipientType: 'smallGroup',
    description: 'UEA SG Outreach Event',
  },
];
