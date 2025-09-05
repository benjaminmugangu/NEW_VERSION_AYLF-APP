import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { SmallGroup, SmallGroupFormData, User, DbSmallGroup } from '@/lib/types';
import { ROLES } from '@/lib/constants';
import { mapDbSmallGroupToSmallGroup, mapSmallGroupFormDataToDb } from '@/lib/mappers';

const supabase = createSupabaseBrowserClient();

export const smallGroupService = {
  getSmallGroupsBySite: async (siteId: string): Promise<SmallGroup[]> => {
    const { data, error } = await supabase
      .from('small_groups')
      .select('*, leader:leader_id(name), members:small_group_members(count)')
      .eq('site_id', siteId)
      .order('name', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data.map(mapDbSmallGroupToSmallGroup);
    }

    // Fallback: route API serveur (utilise la clé service) pour contourner RLS client
    const resp = await fetch(`/api/small-groups/by-site?id=${encodeURIComponent(siteId)}`, { credentials: 'include' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || (error?.message ?? 'Failed to load small groups'));
    }
    const fallback = await resp.json();
    return (fallback || []).map((row: any) => mapDbSmallGroupToSmallGroup(row));
  },

  getFilteredSmallGroups: async ({ user, search, siteId }: { user: User; search?: string, siteId?: string }): Promise<SmallGroup[]> => {
    if (!user) {
      throw new Error('User not authenticated.');
    }

    let query = supabase.from('small_groups').select('*, sites(name), leader:leader_id(name)');

    switch (user.role) {
      case ROLES.NATIONAL_COORDINATOR:
        if (siteId) query = query.eq('site_id', siteId);
        break;
      case ROLES.SITE_COORDINATOR:
        if (!user.siteId) return [];
        query = query.eq('site_id', user.siteId);
        break;
      case ROLES.SMALL_GROUP_LEADER:
        if (!user.smallGroupId) return [];
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
      throw new Error(`Failed to fetch small groups: ${error.message}`);
    }

    return data.map(mapDbSmallGroupToSmallGroup);
  },

  getSmallGroupById: async (groupId: string): Promise<SmallGroup> => {
    const { data, error } = await supabase.from('small_groups').select('*').eq('id', groupId).single();

    if (error || !data) {
      throw new Error('Small group not found.');
    }

    return mapDbSmallGroupToSmallGroup(data);
  },

  getSmallGroupDetails: async (groupId: string): Promise<SmallGroup> => {
    const { data, error } = await supabase
      .from('small_groups')
      .select('*, sites(id, name), leader:leader_id(id, name, email), logisticsAssistant:logistics_assistant_id(id, name, email), financeAssistant:finance_assistant_id(id, name, email), small_group_members(count)')
      .eq('id', groupId)
      .single();

    if (error || !data) {
      throw new Error('Small group not found.');
    }

    return mapDbSmallGroupToSmallGroup(data);
  },

  createSmallGroup: async (siteId: string, formData: SmallGroupFormData): Promise<SmallGroup> => {
    // Construire un objet d'insertion avec 'name' requis pour satisfaire le typage Supabase
    const dbData = {
      name: formData.name,
      ...mapSmallGroupFormDataToDb(formData),
      site_id: siteId,
    } as { site_id: string; name: string } & Partial<DbSmallGroup>;

    const { data: newGroup, error: createError } = await supabase
      .from('small_groups')
      .insert(dbData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create small group: ${createError.message}`);
    }

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
        if (role) updatePayload.role = role;

        const { error: profileError } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
        if (profileError) {
          throw new Error(`Failed to assign user ${userId} to new group ${newGroup.id}: ${profileError.message}`);
        }
      }
    }

    return mapDbSmallGroupToSmallGroup(newGroup);
  },

  updateSmallGroup: async (groupId: string, formData: SmallGroupFormData): Promise<SmallGroup> => {
    const { data: oldGroup, error: fetchError } = await supabase.from('small_groups').select('*').eq('id', groupId).single();
    if (fetchError || !oldGroup) {
      throw new Error('Small group not found.');
    }

    const dbData = mapSmallGroupFormDataToDb(formData);
    const { data: updatedGroup, error: updateError } = await supabase
      .from('small_groups')
      .update(dbData)
      .eq('id', groupId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const assignments = [
      { oldUserId: oldGroup.leader_id, newUserId: formData.leaderId, role: ROLES.SMALL_GROUP_LEADER },
      { oldUserId: oldGroup.logistics_assistant_id, newUserId: formData.logisticsAssistantId, role: null },
      { oldUserId: oldGroup.finance_assistant_id, newUserId: formData.financeAssistantId, role: null },
    ];

    for (const { oldUserId, newUserId, role } of assignments) {
      if (oldUserId !== newUserId) {
        if (oldUserId) {
          const { error: unassignError } = await supabase.from('profiles').update({ small_group_id: null }).eq('id', oldUserId);
          if (unassignError) throw new Error(`Failed to unassign user ${oldUserId}: ${unassignError.message}`);
        }
        if (newUserId) {
          const updatePayload: { small_group_id: string; site_id: string; role?: string } = {
            small_group_id: groupId,
            site_id: oldGroup.site_id,
          };
          if (role) updatePayload.role = role;
          const { error: assignError } = await supabase.from('profiles').update(updatePayload).eq('id', newUserId);
          if (assignError) throw new Error(`Failed to assign user ${newUserId}: ${assignError.message}`);
        }
      }
    }

    return mapDbSmallGroupToSmallGroup(updatedGroup);
  },

  deleteSmallGroup: async (groupId: string): Promise<void> => {
    const { error: unassignError } = await supabase.from('profiles').update({ small_group_id: null }).eq('small_group_id', groupId);
    if (unassignError) {
      throw new Error(`Failed to unassign members: ${unassignError.message}`);
    }

    const { error: deleteError } = await supabase.from('small_groups').delete().eq('id', groupId);
    if (deleteError) {
      throw new Error(`Failed to delete small group: ${deleteError.message}`);
    }
  },
};
