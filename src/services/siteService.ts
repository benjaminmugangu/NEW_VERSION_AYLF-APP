// src/services/siteService.ts
import { createSupabaseBrowserClient as createBrowserClient } from '@/lib/supabase/client';
// Select appropriate Supabase client for environment
const getSupabase = async () => {
  if (typeof window === 'undefined') {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }
  return createBrowserClient();
};
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

// Map DB row to strict Site type (ensure creationDate present)
const mapDbSiteToSite = (row: any): Site => {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    creationDate: row.creation_date ?? row.created_at ?? new Date().toISOString(),
    coordinatorId: row.coordinator_id ?? undefined,
    // Enriched data if present
    coordinator: row.coordinator ? {
      id: row.coordinator.id,
      name: row.coordinator.name,
      email: row.coordinator.email,
      role: row.coordinator.role,
      status: row.coordinator.status,
      siteId: row.coordinator.site_id,
      smallGroupId: row.coordinator.small_group_id,
      mandateStartDate: row.coordinator.mandate_start_date,
      mandateEndDate: row.coordinator.mandate_end_date,
    } : undefined,
  } as Site;
};

// Define the shape of the data returned by the RPC function
interface SiteDetailsRPCResponse {
  id: string;
  name: string;
  city: string;
  country: string;
  coordinator_id: string;
  creation_date: string;
  coordinator_name: string | null;
  coordinator_profile_picture: string | null;
  small_groups_count: number;
  members_count: number;
}

// Fetches all sites with enriched details using the RPC function.
const getSitesWithDetails = async (user: User | null): Promise<SiteWithDetails[]> => {
  if (!user) {
    throw new Error('User not authenticated.');
  }

    const supabase = await getSupabase();
  let query = (supabase as any)
    .rpc('get_sites_with_details_for_user', {
    p_user_id: user.id,
    p_user_role: user.role,
  }) as any;

  const { data, error } = await query;

  if (!error && data && Array.isArray(data) && data.length > 0) {
    const sites: SiteWithDetails[] = (data as SiteDetailsRPCResponse[]).map((site: SiteDetailsRPCResponse) => ({
      id: site.id,
      name: site.name,
      city: site.city,
      country: site.country,
      coordinatorId: site.coordinator_id,
      creationDate: site.creation_date,
      coordinatorName: site.coordinator_name,
      coordinatorProfilePicture: site.coordinator_profile_picture || undefined,
      smallGroupsCount: site.small_groups_count || 0,
      membersCount: site.members_count || 0,
    }));
    return sites;
  }

  // Fallback: passer par une route API serveur qui utilise la clé service (contourne RLS côté client)
  const resp = await fetch('/api/sites/list', { credentials: 'include' });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load sites');
  }
  const fallbackData = await resp.json();
  return (fallbackData || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    creationDate: row.creation_date ?? new Date().toISOString(),
    coordinatorId: row.coordinator_id ?? undefined,
    coordinatorName: undefined,
    coordinatorProfilePicture: undefined,
    smallGroupsCount: 0,
    membersCount: 0,
  }));
}
;

const getSiteDetails = async (siteId: string): Promise<{ site: Site; smallGroups: any[]; totalMembers: number }> => {
  // Step 1: Fetch site details including the coordinator's name via a join.
  const supabase = await getSupabase();
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

  return {
    site: mapDbSiteToSite(siteData),
    smallGroups: smallGroupsData,
    totalMembers,
  };
};

const getSiteById = async (id: string): Promise<Site> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('sites').select('*').eq('id', id).single();
  if (error) {
    console.error(`[SiteService] Error in getSiteById for id ${id}:`, error.message);
    throw new Error('Site not found.');
  }
  return mapDbSiteToSite(data);
};

const createSite = async (siteData: SiteFormData): Promise<Site> => {
  if (!siteData.name || siteData.name.trim().length < 3) {
    throw new Error('Site name must be at least 3 characters long.');
  }
  const dbData = toSiteDbData(siteData);

  const supabase = await getSupabase();
  const { data, error } = await supabase.from('sites').insert(dbData).select().single();

  if (error) {
    console.error('[SiteService] Error in createSite:', error.message);
    throw new Error(error.message);
  }
  return mapDbSiteToSite(data);
};

const updateSite = async (id: string, updatedData: Partial<SiteFormData>): Promise<Site> => {
  if (updatedData.name && updatedData.name.trim().length < 3) {
    throw new Error('Site name must be at least 3 characters long.');
  }
  const dbData = toSiteDbData(updatedData);

  const supabase = await getSupabase();
  const { data, error } = await supabase.from('sites').update(dbData).eq('id', id).select().single();

  if (error) {
    console.error(`[SiteService] Error in updateSite for id ${id}:`, error.message);
    throw new Error(error.message);
  }
  return mapDbSiteToSite(data);
};

const deleteSite = async (id: string): Promise<void> => {
  const supabase = await getSupabase();
  const { error } = await supabase.from('sites').delete().eq('id', id);

  if (error) {
    console.error(`[SiteService] Error in deleteSite for id ${id}:`, error.message);
    // Provide a more user-friendly message for foreign key violations
    if (error.code === '23503') {
      throw new Error('Cannot delete site with active small groups or members. Please reassign them first.');
    }
    throw new Error(error.message);
  }
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
