// src/services/smallGroupService.ts
import { createClient } from '@/utils/supabase/client';
import type { SmallGroup, SmallGroupFormData, User } from '@/lib/types';
import { ROLES } from '@/lib/constants';

// Helper to convert DB snake_case to frontend camelCase
const toSmallGroupModel = (dbSmallGroup: any): SmallGroup => {
  // The dbSmallGroup can be complex due to joins
  const memberSource = dbSmallGroup.small_group_members || dbSmallGroup.members; // Handle both possible structures
  const memberCountObject = Array.isArray(memberSource) ? memberSource[0] : { count: 0 };

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
    memberCount: memberCountObject?.count ?? 0,
    leader: dbSmallGroup.leader,
    logisticsAssistant: dbSmallGroup.logisticsAssistant,
    financeAssistant: dbSmallGroup.financeAssistant,
  };
};

const smallGroupService = {
    getSmallGroupsBySite: async (siteId: string): Promise<SmallGroup[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('small_groups')
      .select('*')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data.map(toSmallGroupModel);
  },
    getFilteredSmallGroups: async ({ user, search, siteId }: { user: User; search?: string, siteId?: string }): Promise<SmallGroup[]> => {
    const supabase = createClient();
    if (!user) {
      throw new Error('User not authenticated.');
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
        if (siteId) {
          query = query.eq('site_id', siteId);
        }
        break;
      case ROLES.SITE_COORDINATOR:
        if (!user.siteId) {
          return [];
        }
        query = query.eq('site_id', user.siteId);
        break;
      case ROLES.SMALL_GROUP_LEADER:
        if (!user.smallGroupId) {
          return [];
        }
        query = query.eq('id', user.smallGroupId);
        break;
      default:
        return [];
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SmallGroupService] Error in getFilteredSmallGroups:', error.message);
      throw new Error(`Failed to fetch small groups: ${error.message}`);
    }

    return data.map(toSmallGroupModel);
  },

    getSmallGroupById: async (groupId: string): Promise<SmallGroup> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('small_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (error) {
      throw new Error('Small group not found.');
    }

    return toSmallGroupModel(data);
  },

    getSmallGroupDetails: async (groupId: string): Promise<SmallGroup> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('small_groups')
      .select(`
        *,
        sites (id, name),
        leader:leader_id (id, name, email),
        logisticsAssistant:logistics_assistant_id (id, name, email),
        financeAssistant:finance_assistant_id (id, name, email),
        small_group_members (count)
      `)
      .eq('id', groupId)
      .single();

    if (error) {
      throw new Error('Small group not found.');
    }

    return toSmallGroupModel(data);
  },

    createSmallGroup: async (siteId: string, formData: SmallGroupFormData): Promise<SmallGroup> => {
    const supabase = createClient();
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
      throw new Error(createError.message);
    }

    if (!newGroup) {
      throw new Error('Failed to create small group, no data returned.');
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
          site_id: siteId 
        };
        if (role) updatePayload.role = role;
        const { error: assignmentError } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
        if (assignmentError) {
            // Attempt to roll back group creation for consistency
            await supabase.from('small_groups').delete().eq('id', newGroup.id);
            throw new Error(`Failed to assign user ${userId}: ${assignmentError.message}`);
        }
      }
    }

    return toSmallGroupModel(newGroup);
  },

      updateSmallGroup: async (groupId: string, formData: Partial<SmallGroupFormData>): Promise<SmallGroup> => {
    const supabase = createClient();
    // 1. Get old group to compare assignments
    const { data: oldGroup, error: fetchError } = await supabase.from('small_groups').select('*').eq('id', groupId).single();
    if (fetchError || !oldGroup) {
      throw new Error('Small group not found.');
    }

    // 2. Update small group details
        const updatePayload: any = {};
    if (formData.name) updatePayload.name = formData.name;
    if (formData.meetingDay) updatePayload.meeting_day = formData.meetingDay;
    if (formData.meetingTime) updatePayload.meeting_time = formData.meetingTime;
    if (formData.meetingLocation) updatePayload.meeting_location = formData.meetingLocation;
    if (formData.leaderId !== undefined) updatePayload.leader_id = formData.leaderId;
    if (formData.logisticsAssistantId !== undefined) updatePayload.logistics_assistant_id = formData.logisticsAssistantId;
    if (formData.financeAssistantId !== undefined) updatePayload.finance_assistant_id = formData.financeAssistantId;

    const { data: updatedGroup, error: updateError } = await supabase
      .from('small_groups')
      .update(updatePayload)
      .eq('id', groupId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    // 3. Update user assignments
        const assignments = [
      { oldUserId: oldGroup.leader_id, newUserId: formData.leaderId, role: ROLES.SMALL_GROUP_LEADER },
      { oldUserId: oldGroup.logistics_assistant_id, newUserId: formData.logisticsAssistantId, role: null },
      { oldUserId: oldGroup.finance_assistant_id, newUserId: formData.financeAssistantId, role: null },
    ].filter(a => a.newUserId !== undefined);

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

    return toSmallGroupModel(updatedGroup);
  },

    deleteSmallGroup: async (groupId: string): Promise<void> => {
    const supabase = createClient();
    try {
      // 1. Unassign all users (leaders, assistants, members) from the small group.
      const { error: unassignError } = await supabase
        .from('profiles')
        .update({ small_group_id: null })
        .eq('small_group_id', groupId);

      if (unassignError) {
        console.error('[SmallGroupService] Error unassigning members during group deletion:', unassignError.message);
        throw new Error(`Failed to unassign members: ${unassignError.message}`);
      }

      // 2. Perform a hard delete on the small group itself.
      const { error: deleteError } = await supabase
        .from('small_groups')
        .delete()
        .eq('id', groupId);

      if (deleteError) {
        console.error('[SmallGroupService] Error deleting small group:', deleteError.message);
        throw new Error(`Failed to delete small group: ${deleteError.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(`[SmallGroupService] Unexpected error in deleteSmallGroup: ${errorMessage}`);
      throw new Error(`An unexpected error occurred: ${errorMessage}`);
    }
  },
};

export default smallGroupService;
