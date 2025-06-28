// src/hooks/useFinancials.ts
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { ROLES } from '@/lib/constants';
import { mockTransactions, mockReports } from '@/lib/mockData';
import type { Transaction, Report } from '@/lib/types';
import { applyDateFilter, type DateFilterValue } from '@/components/shared/DateRangeFilter';

export interface FinancialStats {
  fundsReceived: number;
  expensesDeclared: number;
  fundsReallocated: number;
  balance: number;
  relevantTransactions: Transaction[];
  relevantReports: Report[];
}

export const useFinancials = (dateFilter?: DateFilterValue) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<FinancialStats>({
    fundsReceived: 0,
    expensesDeclared: 0,
    fundsReallocated: 0,
    balance: 0,
    relevantTransactions: [],
    relevantReports: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Simulate async data fetching
    setTimeout(() => {
      const filteredTransactions = dateFilter ? applyDateFilter(mockTransactions, dateFilter) : mockTransactions;
      const filteredReports = dateFilter ? applyDateFilter(mockReports, dateFilter) : mockReports;
      let fundsReceived = 0;
      let expensesDeclared = 0;
      let fundsReallocated = 0;
      let relevantTransactions: Transaction[] = [];
      let relevantReports: Report[] = [];

      if (currentUser.role === ROLES.NATIONAL_COORDINATOR) {
        fundsReceived = filteredTransactions
          .filter(t => t.recipientEntityType === 'national' && t.transactionType === 'income_source')
          .reduce((sum, t) => sum + t.amount, 0);

        const nationalExpenses = filteredTransactions
          .filter(t => t.senderEntityType === 'national' && t.transactionType === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        fundsReallocated = filteredTransactions
          .filter(t => t.senderEntityType === 'national' && t.recipientEntityType === 'site')
          .reduce((sum, t) => sum + t.amount, 0);
        
        expensesDeclared = nationalExpenses; // For NC, direct expenses are primary.
        relevantTransactions = filteredTransactions.filter(t => t.level === 'national');

      } else if (currentUser.role === ROLES.SITE_COORDINATOR && currentUser.siteId) {
        const { siteId } = currentUser;
        fundsReceived = filteredTransactions
          .filter(t => t.recipientEntityType === 'site' && t.recipientEntityId === siteId)
          .reduce((sum, t) => sum + t.amount, 0);

        expensesDeclared = filteredReports
          .filter(r => r.siteId === siteId && r.amountUsed)
          .reduce((sum, r) => sum + (r.amountUsed || 0), 0);

        fundsReallocated = filteredTransactions
          .filter(t => t.senderEntityType === 'site' && t.senderEntityId === siteId)
          .reduce((sum, t) => sum + t.amount, 0);
        
        relevantTransactions = filteredTransactions.filter(t => t.relatedSiteId === siteId);
        relevantReports = filteredReports.filter(r => r.siteId === siteId);

      } else if (currentUser.role === ROLES.SMALL_GROUP_LEADER && currentUser.smallGroupId) {
        const { smallGroupId } = currentUser;
        fundsReceived = filteredTransactions
          .filter(t => t.recipientEntityType === 'small_group' && t.recipientEntityId === smallGroupId)
          .reduce((sum, t) => sum + t.amount, 0);

        expensesDeclared = filteredReports
          .filter(r => r.smallGroupId === smallGroupId && r.amountUsed)
          .reduce((sum, r) => sum + (r.amountUsed || 0), 0);

        fundsReallocated = 0;
        relevantTransactions = filteredTransactions.filter(t => t.relatedSmallGroupId === smallGroupId);
        relevantReports = filteredReports.filter(r => r.smallGroupId === smallGroupId);
      }

      const balance = fundsReceived - expensesDeclared - fundsReallocated;

      setStats({
        fundsReceived,
        expensesDeclared,
        fundsReallocated,
        balance,
        relevantTransactions,
        relevantReports,
      });
      setIsLoading(false);
    }, 300); // Simulate network delay

  }, [currentUser, dateFilter]);

  return {
    stats,
    isLoading,
    currentUser,
  };
};
