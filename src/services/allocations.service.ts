// src/services/allocations.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { FundAllocation, FundAllocationFormData, ServiceResponse } from '@/lib/types';

const baseSelectQuery = `
  *,
  sender:sender_id(name),
  recipient_site:recipient_site_id(name),
  recipient_small_group:recipient_small_group_id(name),
  creator:created_by(name)
`;

const toAllocationModel = (dbAllocation: any): FundAllocation => {
  // This function now needs to be flexible to handle both old and new fields
  // until the data model is fully migrated.
  return {
    id: dbAllocation.id,
    amount: dbAllocation.amount,
    allocationDate: dbAllocation.allocation_date,
    goal: dbAllocation.goal, // NEW
    source: dbAllocation.source, // NEW
    status: dbAllocation.status, // NEW
    allocatedById: dbAllocation.allocated_by_id, // NEW
    siteId: dbAllocation.site_id, // NEW mapping
    smallGroupId: dbAllocation.small_group_id, // NEW mapping
    notes: dbAllocation.notes, // NEW
    // Enriched data - assuming new relations might not exist yet
    allocatedByName: dbAllocation.creator?.name, // Map from creator
    siteName: dbAllocation.recipient_site?.name, // Map from recipient_site
    smallGroupName: dbAllocation.recipient_small_group?.name, // Map from recipient_small_group
    // Legacy fields for compatibility, will be undefined in new records
    sourceTransactionId: dbAllocation.source_transaction_id,
  } as FundAllocation;
};

export const allocationService = {
  getAllocations: async (filters?: { siteId?: string; smallGroupId?: string }): Promise<ServiceResponse<FundAllocation[]>> => {
    let query = supabase
      .from('fund_allocations')
      .select(baseSelectQuery);

    if (filters) {
      if (filters.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      if (filters.smallGroupId) {
        query = query.eq('small_group_id', filters.smallGroupId);
      }
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, data: data.map(toAllocationModel) };
  },

  getAllocationById: async (id: string): Promise<ServiceResponse<FundAllocation>> => {
    const { data, error } = await supabase
      .from('fund_allocations')
      .select(baseSelectQuery)
      .eq('id', id)
      .single();

    if (error) {

      return { success: false, error: { message: 'Allocation not found.' } };
    }

    return { success: true, data: toAllocationModel(data) };
  },

    createAllocation: async (formData: FundAllocationFormData): Promise<ServiceResponse<FundAllocation>> => {
    const { data, error } = await supabase
      .from('fund_allocations')
      .insert({
        amount: formData.amount,
        allocation_date: formData.allocationDate,
        goal: formData.goal,
        source: formData.source,
        status: formData.status,
        allocated_by_id: formData.allocatedById,
        site_id: formData.siteId,
        small_group_id: formData.smallGroupId,
        notes: formData.notes,
      })
      .select('id')
      .single();

    if (error) {

      return { success: false, error: { message: error.message } };
    }

    return allocationService.getAllocationById(data.id);
  },

    updateAllocation: async (id: string, formData: Partial<FundAllocationFormData>): Promise<ServiceResponse<FundAllocation>> => {
    const { error } = await supabase
      .from('fund_allocations')
      .update({
        amount: formData.amount,
        allocation_date: formData.allocationDate,
        goal: formData.goal,
        source: formData.source,
        status: formData.status,
        site_id: formData.siteId,
        small_group_id: formData.smallGroupId,
        notes: formData.notes,
      })
      .eq('id', id);

    if (error) {

      return { success: false, error: { message: error.message } };
    }

    return allocationService.getAllocationById(id);
  },

  deleteAllocation: async (id: string): Promise<ServiceResponse<{ id: string }>> => {
    const { error } = await supabase.from('fund_allocations').delete().eq('id', id);

    if (error) {

      return { success: false, error: { message: error.message } };
    }

    return { success: true, data: { id } };
  },
};




