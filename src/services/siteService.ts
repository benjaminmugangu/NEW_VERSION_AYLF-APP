// src/services/site.service.ts
'use client';

import { supabase } from '@/lib/supabaseClient';
import type { Site, User, ServiceResponse } from '@/lib/types';

// Helper to convert DB snake_case to frontend camelCase
const toSiteModel = (dbSite: any): Site => ({
  id: dbSite.id,
  name: dbSite.name,
  city: dbSite.city,
  country: dbSite.country,
  coordinatorId: dbSite.coordinator_id,
  creationDate: dbSite.creation_date,
});

const siteService = {
  getAllSites: async (): Promise<ServiceResponse<Site[]>> => {
    const { data, error } = await supabase.from('sites').select('*');
    if (error) {
      console.error('Error fetching sites:', error);
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: data.map(toSiteModel) };
  },

  getSiteById: async (siteId: string): Promise<ServiceResponse<Site>> => {
    const { data, error } = await supabase.from('sites').select('*').eq('id', siteId).single();
    if (error) {
      console.error(`Error fetching site ${siteId}:`, error);
      return { success: false, error: { message: `Site with id ${siteId} not found.` } };
    }
    return { success: true, data: toSiteModel(data) };
  },

  getCoordinatorForSite: async (siteId: string): Promise<ServiceResponse<User>> => {
    const { data, error } = await supabase
      .from('sites')
      .select('coordinator:profiles(*)')
      .eq('id', siteId)
      .single();

    if (error || !data?.coordinator) {
      console.error(`Error fetching coordinator for site ${siteId}:`, error);
      return { success: false, error: { message: 'Coordinator not found for this site.' } };
    }
    // The 'profiles' table columns should match the 'User' type
    return { success: true, data: data.coordinator as unknown as User };
  },

  createSite: async (siteData: Omit<Site, 'id' | 'smallGroups' | 'memberCount'>): Promise<ServiceResponse<Site>> => {
    if (!siteData.name || siteData.name.trim().length < 3) {
      return { success: false, error: { message: 'Site name must be at least 3 characters long.' } };
    }
    const { data, error } = await supabase
      .from('sites')
      .insert({
        name: siteData.name,
        city: siteData.city,
        country: siteData.country,
        coordinator_id: siteData.coordinatorId,
        creation_date: siteData.creationDate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating site:', error);
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: toSiteModel(data) };
  },

  updateSite: async (siteId: string, updatedData: Partial<Omit<Site, 'id' | 'smallGroups' | 'memberCount'>>): Promise<ServiceResponse<Site>> => {
    if (updatedData.name && updatedData.name.trim().length < 3) {
      return { success: false, error: { message: 'Site name must be at least 3 characters long.' } };
    }
    
    const dbUpdateData = {
      ...(updatedData.name && { name: updatedData.name }),
      ...(updatedData.city && { city: updatedData.city }),
      ...(updatedData.country && { country: updatedData.country }),
      ...(updatedData.coordinatorId && { coordinator_id: updatedData.coordinatorId }),
      ...(updatedData.creationDate && { creation_date: updatedData.creationDate }),
    };

    const { data, error } = await supabase
      .from('sites')
      .update(dbUpdateData)
      .eq('id', siteId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating site ${siteId}:`, error);
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: toSiteModel(data) };
  },

  deleteSite: async (siteId: string): Promise<ServiceResponse<{ id: string }>> => {
    const { error } = await supabase.from('sites').delete().eq('id', siteId);

    if (error) {
      console.error(`Error deleting site ${siteId}:`, error);
      // Foreign key constraint violation
      if (error.code === '23503') {
        return { success: false, error: { message: 'Cannot delete site with active small groups or members. Please reassign them first.' } };
      }
      return { success: false, error: { message: error.message } };
    }
    return { success: true, data: { id: siteId } };
  },

  getSiteDetails: async (siteId: string): Promise<ServiceResponse<{ membersCount: number; smallGroupsCount: number }>> => {
    const { data, error } = await supabase
      .from('sites')
      .select('members(count), small_groups(count)')
      .eq('id', siteId)
      .single();

    if (error) {
      console.error(`Error fetching site details for ${siteId}:`, error);
      return { success: false, error: { message: error.message } };
    }

    const membersCount = data.members[0]?.count || 0;
    const smallGroupsCount = data.small_groups[0]?.count || 0;

    return { success: true, data: { membersCount, smallGroupsCount } };
  },
};

export default siteService;
