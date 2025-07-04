// src/services/allocations.service.ts

import { mockFundAllocations } from '@/lib/mockData';
import type { ServiceResponse, FundAllocation, FundAllocationFormData } from "@/lib/types";
import { v4 as uuidv4 } from 'uuid';

const allocationService = {
  /**
   * Creates a new fund allocation and adds it to the mock data array.
   * In a real application, this would send a request to a backend API.
   * @param formData The data for the new allocation.
   * @returns A promise that resolves to the newly created fund allocation.
   */
  async createAllocation(formData: FundAllocationFormData): Promise<ServiceResponse<FundAllocation>> {
    console.log('Creating new allocation with data:', formData);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    try {
      // In a real app, senderId would come from the logged-in user's session
      const senderType = formData.recipientType === 'site' ? 'national' : 'site';
      const senderId = senderType === 'national' ? 'user_famba' : 'site_beni'; // Placeholder

      const newAllocation: FundAllocation = {
        id: `alloc_${Date.now()}`,
        allocationDate: new Date().toISOString(),
        amount: formData.amount,
        description: formData.description,
        senderId: senderId,
        senderType: senderType,
        recipientId: formData.recipientId,
        recipientType: formData.recipientType,
        createdById: 'user_famba' // Placeholder for logged-in user
      };

      mockFundAllocations.push(newAllocation);
      console.log('New allocation created:', newAllocation);
      return { success: true, data: newAllocation };
    } catch (error) {
      console.error('Error creating allocation:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, error: `Failed to create allocation: ${errorMessage}` };
    }
  },

  /**
   * Retrieves all fund allocations.
   * In a real application, this would fetch data from a backend API.
   * @returns A promise that resolves to an array of all fund allocations.
   */
  async getAllAllocations(): Promise<ServiceResponse<FundAllocation[]>> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    try {
      return { success: true, data: [...mockFundAllocations] };
    } catch (error) {
      console.error('Error fetching all allocations:', error);
      return { success: false, error: 'Failed to fetch allocations.' };
    }
  },

};

export default allocationService;
