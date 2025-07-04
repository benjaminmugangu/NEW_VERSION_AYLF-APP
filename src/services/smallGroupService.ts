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
  };
};

const smallGroupService = {
  // Combined function to get small groups with filters
  getSmallGroups: async (filters: { siteId?: string; search?: string } = {}): Promise<ServiceResponse<SmallGroup[]>> => {
    let query = supabase
      .from('small_groups')
      .select(`
        *,
        sites (name),
        leader:leader_id (name),
        members (count)
      `);

    if (filters.siteId) {
      query = query.eq('site_id', filters.siteId);
    }
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching small groups:', error);
      return { success: false, error: { message: error.message } };
    }

    const smallGroups = data.map(toSmallGroupModel);
    return { success: true, data: smallGroups };
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
      console.error(`Error fetching details for small group ${groupId}:`, error);
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
      console.error('Error creating small group:', createError);
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

  deleteSmallGroup: async (groupId: string): Promise<ServiceResponse<{ id: string }>> => {
    // 1. Check for members
    const { count, error: memberError } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('small_group_id', groupId);
    if (memberError) return { success: false, error: { message: memberError.message } };
    if (count && count > 0) {
      return { success: false, error: { message: 'Cannot delete small group with members. Please reassign them first.' } };
    }

    // 2. Unassign leaders/assistants
    const { data: group, error: fetchError } = await supabase.from('small_groups').select('*').eq('id', groupId).single();
    if (fetchError || !group) return { success: false, error: { message: 'Small group not found.' } };
    
    const userIds = [group.leader_id, group.logistics_assistant_id, group.finance_assistant_id].filter(Boolean);
    if (userIds.length > 0) {
      await supabase.from('profiles').update({ small_group_id: null }).in('id', userIds);
    }

    // 3. Delete the group
    const { error: deleteError } = await supabase.from('small_groups').delete().eq('id', groupId);
    if (deleteError) return { success: false, error: { message: deleteError.message } };

    return { success: true, data: { id: groupId } };
  },
};

export default smallGroupService;
