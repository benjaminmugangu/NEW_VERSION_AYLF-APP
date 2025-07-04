// src/services/financials.service.ts

/**
 * @file This file centralizes all logic for fetching and processing financial data.
 * In the future, this is where calls to the Supabase API will be made.
 * Components and hooks will only consume the functions exported by this service,
 * without worrying about the data source (mock, API, etc.).
 */

import allocationsService from './allocations.service';
import type { FundAllocation, Report, ReportWithDetails, Role, ServiceResponse } from '@/lib/types';
import reportService from './report.service';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';

export interface FinancialStats {
  fundsReceived: number;
  expensesDeclared: number;
  fundsReallocated: number;
  balance: number;
  allocationsReceived: FundAllocation[];
  allocationsSent: FundAllocation[];
  relevantReports: ReportWithDetails[];
}

export interface FinancialsOptions {
    dateFilter?: DateFilterValue;
    context: {
        type: Role | 'site' | 'smallGroup';
        id?: string;
    };
}

// Simulates an asynchronous API call
export const getFinancialStats = async (options: FinancialsOptions): Promise<ServiceResponse<FinancialStats>> => {
    const { dateFilter, context } = options;

    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network latency

    try {
        const allocationsResponse = await allocationsService.getAllAllocations();
        if (!allocationsResponse.success) {
            return { success: false, error: `Failed to fetch allocations: ${allocationsResponse.error}` };
        }
        
        const allAllocations = allocationsResponse.data;
        const filteredAllocations = dateFilter ? applyDateFilter(allAllocations.map(a => ({...a, date: a.allocationDate})), dateFilter) : allAllocations;
        
        let allocationsReceived: FundAllocation[] = [];
        let allocationsSent: FundAllocation[] = [];
        let relevantReports: ReportWithDetails[] = [];

        const reportFilters = {
            status: 'approved' as const,
            dateRange: dateFilter,
        };

        switch (context.type) {
            case 'national_coordinator': {
                allocationsSent = filteredAllocations
                    .filter((a) => a.senderType === 'national')
                    .sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
                
                const response = await reportService.getReportsWithDetails(reportFilters);
                if (response.success) relevantReports = response.data;
                break;
            }
            
            case 'site':
            case 'site_coordinator': {
                if (context.id) {
                    allocationsReceived = filteredAllocations
                        .filter((a) => a.recipientType === 'site' && a.recipientId === context.id)
                        .sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
                    allocationsSent = filteredAllocations
                        .filter((a) => a.senderType === 'site' && a.senderId === context.id)
                        .sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
                    
                    const response = await reportService.getReportsWithDetails({ ...reportFilters, siteId: context.id });
                    if (response.success) relevantReports = response.data;
                }
                break;
            }
            
            case 'smallGroup':
            case 'small_group_leader': {
                if (context.id) {
                    allocationsReceived = filteredAllocations
                        .filter((a) => a.recipientType === 'smallGroup' && a.recipientId === context.id)
                        .sort((a, b) => new Date(b.allocationDate).getTime() - new Date(a.allocationDate).getTime());
                    
                    const response = await reportService.getReportsWithDetails({ ...reportFilters, smallGroupId: context.id });
                    if (response.success) relevantReports = response.data;
                }
                break;
            }
        }

        const fundsReceived = allocationsReceived.reduce((sum, a) => sum + a.amount, 0);
        const fundsReallocated = allocationsSent.reduce((sum, a) => sum + a.amount, 0);
        const expensesDeclared = relevantReports.reduce((sum, r) => sum + (r.expenses || 0), 0);
        const balance = fundsReceived - expensesDeclared - fundsReallocated;

        const stats: FinancialStats = {
            fundsReceived,
            expensesDeclared,
            fundsReallocated,
            balance,
            allocationsReceived,
            allocationsSent,
            relevantReports,
        };
        
        return { success: true, data: stats };

    } catch (error) {
        console.error('Error calculating financial stats:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: `Failed to get financial stats: ${errorMessage}` };
    }
};
