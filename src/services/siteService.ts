// src/services/siteService.ts
import { supabase } from '@/lib/supabaseClient';
import type { Site, SiteFormData, SiteWithDetails, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

// Helper to convert frontend camelCase to DB snake_case for writing
const toSiteDbData = (siteData: Partial<SiteFormData>): any => {
  const dbData: { [key: string]: any } = {};
  if (siteData.name !== undefined) dbData.name = siteData.name;
  if (siteData.city !== undefined) dbData.city = siteData.city;
  if (siteData.country !== undefined) dbData.country = siteData.country;
  if (siteData.coordinatorId !== undefined) dbData.coordinator_id = siteData.coordinatorId;

  return dbData;
};

// Define the shape of the data returned by the RPC function
interface SiteDetailsRPCResponse {
  id: string;
  name: string;
  city: string;
  country: string;
  coordinator_id: string;
  created_at: string;
  coordinator_name: string | null;
  small_groups_count: number;
  members_count: number;
}

// Fetches all sites with enriched details using the RPC function.
const getSitesWithDetails = async (user: User | null): Promise<SiteWithDetails[]> => {
  if (!user) {
    throw new Error('User not authenticated.');
  }

  const { data, error } = await supabase.rpc('get_sites_with_details', {});

  if (error) {
    console.error('[SiteService] Error in getSitesWithDetails (RPC):', error.message);
    throw new Error(error.message);
  }

  const allSites: SiteWithDetails[] = (data as SiteDetailsRPCResponse[]).map((site: SiteDetailsRPCResponse) => ({
    id: site.id,
    name: site.name,
    city: site.city,
    country: site.country,
    coordinatorId: site.coordinator_id,
    creationDate: site.created_at,
    coordinatorName: site.coordinator_name,
    smallGroupsCount: site.small_groups_count || 0,
    membersCount: site.members_count || 0,
  }));

  switch (user.role) {
    case ROLES.NATIONAL_COORDINATOR:
      return allSites;
    case ROLES.SITE_COORDINATOR:
    case ROLES.SMALL_GROUP_LEADER:
      return user.siteId ? allSites.filter(s => s.id === user.siteId) : [];
    default:
      return [];
  }
};

const getSiteDetails = async (siteId: string): Promise<{ site: Site; smallGroups: any[]; totalMembers: number }> => {
  // Step 1: Fetch site details including the coordinator's name via a join.
  const { data: siteData, error: siteError } = await supabase
    .from('sites')
    .select('*, coordinator:coordinator_id (id, name, email)')
    .eq('id', siteId)
    .single();

  if (siteError) {
    console.error(`[SiteService] Error fetching site details for ${siteId}:`, siteError.message);
    throw new Error(siteError.message);
  }

  // Step 2: Fetch small groups with their member counts using an RPC call.
  // This is more efficient than fetching all groups and then counting members on the client.
  const { data: smallGroupsData, error: rpcError } = await supabase.rpc('get_small_groups_with_member_count_by_site', {
    p_site_id: siteId,
  });

  if (rpcError) {
    console.error(`[SiteService] Error fetching small groups for site ${siteId} via RPC:`, rpcError.message);
    throw new Error(rpcError.message);
  }

  // Step 3: Calculate total members from the RPC call result.
  const totalMembers = smallGroupsData.reduce((acc: number, group: any) => acc + (group.members_count || 0), 0);

  // Helper to map DB small_group to frontend model
  const toSmallGroupModel = (dbGroup: any) => ({
    id: dbGroup.id,
    name: dbGroup.name,
    siteId: dbGroup.site_id,
    leaderId: dbGroup.leader_id,
    meetingDay: dbGroup.meeting_day,
    meetingTime: dbGroup.meeting_time,
    meetingLocation: dbGroup.meeting_location,
    createdAt: dbGroup.created_at, // Corrected field
    logisticsAssistantId: dbGroup.logistics_assistant_id,
    financeAssistantId: dbGroup.finance_assistant_id,
    membersCount: dbGroup.members_count,
    leaderName: dbGroup.leader_name,
  });

  return {
    site: siteData as Site,
    smallGroups: smallGroupsData.map(toSmallGroupModel),
    totalMembers,
  };
};

const getSiteById = async (id: string): Promise<Site> => {
  const { data, error } = await supabase.from('sites').select('*').eq('id', id).single();
  if (error) {
    console.error(`[SiteService] Error in getSiteById for id ${id}:`, error.message);
    throw new Error('Site not found.');
  }
  return data;
};

const createSite = async (siteData: SiteFormData): Promise<Site> => {
  if (!siteData.name || siteData.name.trim().length < 3) {
    throw new Error('Site name must be at least 3 characters long.');
  }
  const dbData = toSiteDbData(siteData);

  const { data, error } = await supabase.from('sites').insert(dbData).select().single();

  if (error) {
    console.error('[SiteService] Error in createSite:', error.message);
    throw new Error(error.message);
  }
  return data;
};

const updateSite = async (id: string, updatedData: Partial<SiteFormData>): Promise<Site> => {
  if (updatedData.name && updatedData.name.trim().length < 3) {
    throw new Error('Site name must be at least 3 characters long.');
  }
  const dbData = toSiteDbData(updatedData);

  const { data, error } = await supabase.from('sites').update(dbData).eq('id', id).select().single();

  if (error) {
    console.error(`[SiteService] Error in updateSite for id ${id}:`, error.message);
    throw new Error(error.message);
  }
  return data;
};

const deleteSite = async (id: string): Promise<{ id: string }> => {
  const { error } = await supabase.from('sites').delete().eq('id', id);

  if (error) {
    console.error(`[SiteService] Error in deleteSite for id ${id}:`, error.message);
    // Provide a more user-friendly message for foreign key violations
    if (error.code === '23503') {
      throw new Error('Cannot delete site with active small groups or members. Please reassign them first.');
    }
    throw new Error(error.message);
  }
  return { id };
};

const siteService = {
  getSitesWithDetails,
  getSiteDetails, // Add this new function
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
};

export default siteService;
