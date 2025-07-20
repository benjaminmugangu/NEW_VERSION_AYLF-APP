// src/services/smallGroupService.ts
import { supabase } from '@/lib/supabaseClient';
import type { SmallGroup, SmallGroupFormData, ServiceResponse, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

// Helper to convert DB snake_case to frontend camelCase
const toSmallGroupModel = (dbSmallGroup: any): SmallGroup => {
  // The dbSmallGroup can be complex due to joins
  return {
    id: dbSmallGroup.id,
    name: dbSmallGroup.name,
    siteId: dbSmallGroup.site_id,
    leaderId: dbSmallGroup.leader_id,
    logisticsAssistantId: dbSmallGroup.logistics_assistant_id,
    financeAssistantId: dbSmallGroup.finance_assistant_id,
    meetingDay: dbSmallGroup.meeting_day,
    meetingTime: dbSmallGroup.meeting_time,
    meetingLocation: dbSmallGroup.meeting_location,
    // Enriched data from joins
    siteName: dbSmallGroup.sites?.name,
    leaderName: dbSmallGroup.leader?.name,
    memberCount: Array.isArray(dbSmallGroup.members) ? dbSmallGroup.members[0]?.count : 0,
    leader: dbSmallGroup.leader,
    logisticsAssistant: dbSmallGroup.logisticsAssistant,
    financeAssistant: dbSmallGroup.financeAssistant,
  };
};

const smallGroupService = {
  getSmallGroupsBySite: async (siteId: string): Promise<ServiceResponse<SmallGroup[]>> => {
    const { data, error } = await supabase
      .from('small_groups')
      .select('*')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, data: data.map(toSmallGroupModel) };
  },
    getFilteredSmallGroups: async ({ user, search, siteId }: { user: User; search?: string, siteId?: string }): Promise<ServiceResponse<SmallGroup[]>> => {
    if (!user) {
      return { success: false, error: { message: 'User not authenticated.' } };
    }

    let query = supabase
      .from('small_groups')
      .select(`
        *,
        sites (name),
        leader:leader_id (name)
      `);

    // Apply role-based filtering
    switch (user.role) {
      case ROLES.NATIONAL_COORDINATOR:
        // If a specific siteId is provided for filtering, use it.
        if (siteId) {
          query = query.eq('site_id', siteId);
        }
        // Otherwise, a national coordinator can see all groups, so no filter is applied.
        break;
      case ROLES.SITE_COORDINATOR:
        if (!user.siteId) {
          return { success: true, data: [] }; // No site assigned, return empty
        }
        query = query.eq('site_id', user.siteId);
        break;
      case ROLES.SMALL_GROUP_LEADER:
        if (!user.smallGroupId) {
          return { success: true, data: [] }; // No group assigned, return empty
        }
        query = query.eq('id', user.smallGroupId);
        break;
      default:
        // Other roles should not see any small groups by default
        return { success: true, data: [] };
    }

    // Apply search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: { message: `Failed to fetch small groups: ${error.message}` } };
    }

    const smallGroups = data.map(toSmallGroupModel);
    return { success: true, data: smallGroups };
  },

  getSmallGroupById: async (groupId: string): Promise<ServiceResponse<SmallGroup>> => {
    const { data, error } = await supabase
      .from('small_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) {
      return { success: false, error: { message: 'Small group not found.' } };
    }

    return { success: true, data: toSmallGroupModel(data) };
  },

  getSmallGroupDetails: async (groupId: string): Promise<ServiceResponse<SmallGroup>> => {
    const { data, error } = await supabase
      .from('small_groups')
      .select(`
        *,
        sites (id, name),
        leader:leader_id (id, name, email, profilePicture),
        logisticsAssistant:logistics_assistant_id (id, name, email, profilePicture),
        financeAssistant:finance_assistant_id (id, name, email, profilePicture),
        members (count)
      `)
      .eq('id', groupId)
      .single();

    if (error) {
      return { success: false, error: { message: 'Small group not found.' } };
    }

    return { success: true, data: toSmallGroupModel(data) };
  },

  createSmallGroup: async (siteId: string, formData: SmallGroupFormData): Promise<ServiceResponse<SmallGroup>> => {
    const { data: newGroup, error: createError } = await supabase
      .from('small_groups')
      .insert({
        site_id: siteId,
        name: formData.name,
        leader_id: formData.leaderId,
        logistics_assistant_id: formData.logisticsAssistantId,
        finance_assistant_id: formData.financeAssistantId,
        meeting_day: formData.meetingDay,
        meeting_time: formData.meetingTime,
        meeting_location: formData.meetingLocation,
      })
      .select()
      .single();

    if (createError) {
      return { success: false, error: { message: createError.message } };
    }

    // Update user assignments
    const assignments = [
      { userId: formData.leaderId, role: ROLES.SMALL_GROUP_LEADER },
      { userId: formData.logisticsAssistantId, role: null },
      { userId: formData.financeAssistantId, role: null },
    ];

    for (const { userId, role } of assignments) {
      if (userId) {
        const updatePayload: { small_group_id: string; site_id: string; role?: string } = {
          small_group_id: newGroup.id,
          site_id: siteId,
        };
        if (role) {
          updatePayload.role = role;
        }
        await supabase.from('profiles').update(updatePayload).eq('id', userId);
      }
    }

    return { success: true, data: toSmallGroupModel(newGroup) };
  },

  updateSmallGroup: async (groupId: string, formData: SmallGroupFormData): Promise<ServiceResponse<SmallGroup>> => {
    // 1. Get old group to compare assignments
    const { data: oldGroup, error: fetchError } = await supabase.from('small_groups').select('*').eq('id', groupId).single();
    if (fetchError || !oldGroup) return { success: false, error: { message: 'Small group not found.' } };

    // 2. Update small group details
    const { data: updatedGroup, error: updateError } = await supabase
      .from('small_groups')
      .update({
        name: formData.name,
        leader_id: formData.leaderId,
        logistics_assistant_id: formData.logisticsAssistantId,
        finance_assistant_id: formData.financeAssistantId,
        meeting_day: formData.meetingDay,
        meeting_time: formData.meetingTime,
        meeting_location: formData.meetingLocation,
      })
      .eq('id', groupId)
      .select()
      .single();

    if (updateError) return { success: false, error: { message: updateError.message } };

    // 3. Update user assignments
    const assignments = [
      { oldUserId: oldGroup.leader_id, newUserId: formData.leaderId, role: ROLES.SMALL_GROUP_LEADER },
      { oldUserId: oldGroup.logistics_assistant_id, newUserId: formData.logisticsAssistantId, role: null },
      { oldUserId: oldGroup.finance_assistant_id, newUserId: formData.financeAssistantId, role: null },
    ];

    for (const { oldUserId, newUserId, role } of assignments) {
      if (oldUserId !== newUserId) {
        // Unassign old user
        if (oldUserId) await supabase.from('profiles').update({ small_group_id: null }).eq('id', oldUserId);
        // Assign new user
        if (newUserId) {
          const updatePayload: { small_group_id: string; site_id: string; role?: string } = { 
            small_group_id: groupId, 
            site_id: oldGroup.site_id 
          };
          if (role) updatePayload.role = role;
          await supabase.from('profiles').update(updatePayload).eq('id', newUserId);
        }
      }
    }

    return { success: true, data: toSmallGroupModel(updatedGroup) };
  },

  deleteSmallGroup: async (groupId: string): Promise<ServiceResponse<null>> => {
    try {
      // 1. Unassign all users (leaders, assistants, members) from the small group.
      const { error: unassignError } = await supabase
        .from('profiles')
        .update({ small_group_id: null })
        .eq('small_group_id', groupId);

      if (unassignError) {
        console.error('Error unassigning members:', unassignError);
        return { success: false, error: { message: `Failed to unassign members: ${unassignError.message}` } };
      }

      // 2. Perform a hard delete on the small group itself.
      const { error: deleteError } = await supabase
        .from('small_groups')
        .delete()
        .eq('id', groupId);

      if (deleteError) {
        console.error('Error deleting small group:', deleteError);
        return { success: false, error: { message: `Failed to delete small group: ${deleteError.message}` } };
      }

      return { success: true, data: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`Unexpected error in deleteSmallGroup: ${errorMessage}`);
      return { success: false, error: { message: `An unexpected error occurred: ${errorMessage}` } };
    }
  },
};

export default smallGroupService;
