// src/hooks/useReports.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { reportService } from '@/services/reportService';
import { ROLES } from '@/lib/constants';
import type { ReportStatus, ReportWithDetails } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';

export const useReports = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and view mode
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: 'All Time' });
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal and action state
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isRejectingReport, setIsRejectingReport] = useState<ReportWithDetails | null>(null);

  const fetchReports = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    const response = await reportService.getReportsWithDetails({
      searchTerm: searchTerm || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      dateRange: dateFilter,
      siteId: currentUser.role === ROLES.SITE_COORDINATOR ? currentUser.siteId : undefined,
      smallGroupId: currentUser.role === ROLES.SMALL_GROUP_LEADER ? currentUser.smallGroupId : undefined,
    });

    if (response.success && response.data) {
      setReports(response.data);
    } else {
      setError(response.error?.message || 'An unknown error occurred while fetching reports.');
      setReports([]);
    }
    setIsLoading(false);
  }, [searchTerm, statusFilter, dateFilter, currentUser]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    setViewMode(isMobile ? 'grid' : 'table');
  }, [isMobile]);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash && reports.length > 0) {
      const reportToSelect = reports.find(r => r.id === hash);
      if (reportToSelect) {
        setSelectedReport(reportToSelect);
        setIsModalOpen(true);
      }
    }
  }, [reports]);

  const handleViewDetails = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setSelectedReport(report);
      setIsModalOpen(true);
      window.location.hash = reportId;
    }
  };
  
  const closeModal = () => {
      setSelectedReport(null);
      setIsModalOpen(false);
      history.pushState("", document.title, window.location.pathname + window.location.search);
  }

  // TODO: Replace with actual backend API call to update report status
  const handleReportStatusUpdate = async (reportId: string, newStatus: ReportStatus, notes?: string) => {

    toast({ title: 'Success (Mock)', description: `Report has been ${newStatus}.` });
    
    setIsModalOpen(false);
    setSelectedReport(null);
    setIsRejectingReport(null);
    setRejectionNotes('');
    await fetchReports();
  };

  const confirmRejectReport = () => {
    if (isRejectingReport && rejectionNotes.trim()) {
      handleReportStatusUpdate(isRejectingReport.id, 'rejected', rejectionNotes);
    } else {
        toast({ title: 'Validation Error', description: 'Rejection notes cannot be empty.', variant: 'destructive' });
    }
  };

  const pageDescription = useMemo(() => {
    let contextMessage = 'Browse and manage all submitted reports.';
    if (currentUser?.role === ROLES.SITE_COORDINATOR) {
      contextMessage = `Viewing reports from your site.`;
    } else if (currentUser?.role === ROLES.SMALL_GROUP_LEADER) {
      contextMessage = `Viewing reports from your small group.`;
    }
    return `${contextMessage} Current filter: ${dateFilter.display}.`;
  }, [currentUser, dateFilter.display]);

  return {
    reports,
    isLoading,
    error,
    filters: {
      searchTerm,
      dateFilter,
      statusFilter,
    },
    view: {
      viewMode,
      isMobile,
    },
    modal: {
      selectedReport,
      isModalOpen,
      isRejectingReport,
      rejectionNotes,
    },
    actions: {
      setSearchTerm,
      setDateFilter,
      setStatusFilter,
      setViewMode,
      handleViewDetails,
      handleReportStatusUpdate,
      confirmRejectReport,
      setIsRejectingReport,
      setRejectionNotes,
      closeModal,
    },
    pageDescription,
    refetch: fetchReports,
  };
};
