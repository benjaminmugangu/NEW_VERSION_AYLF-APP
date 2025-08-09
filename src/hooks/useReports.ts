// src/hooks/useReports.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { reportService, type ReportFilters } from '@/services/reportService';
import { ROLES } from '@/lib/constants';
import type { ReportStatus, ReportWithDetails } from '@/lib/types';
import type { DateFilterValue } from '@/components/shared/DateRangeFilter';

export const useReports = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();



  // Filters and view mode
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ rangeKey: 'all_time', display: 'All Time' });
  const [statusFilter, setStatusFilter] = useState<Record<ReportStatus, boolean>>({ pending: true, approved: true, rejected: true, submitted: true });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modal and action state
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isRejectingReport, setIsRejectingReport] = useState<ReportWithDetails | null>(null);

  const filters = useMemo(() => ({
    user: currentUser,
    searchTerm: searchTerm || undefined,
    dateFilter: dateFilter,
    statusFilter: statusFilter,
  }), [currentUser, searchTerm, dateFilter, statusFilter]);

  const { 
    data: reports = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery<ReportWithDetails[], Error>({
    queryKey: ['reports', filters],
    queryFn: async () => {
      const response = await reportService.getFilteredReports(filters);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch reports.');
    },
    enabled: !!currentUser, // Only run the query if the user is loaded
  });





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
  };

  const updateReportMutation = useMutation({
    mutationFn: ({ reportId, newStatus, notes }: { reportId: string; newStatus: ReportStatus; notes?: string }) => 
      reportService.updateReport(reportId, { status: newStatus, reviewNotes: notes }),
    onSuccess: (updatedReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports', filters] });
      toast({ title: 'Success', description: `Report has been ${updatedReport.status}.` });
      // Close modals and reset state
      setIsModalOpen(false);
      setSelectedReport(null);
      setIsRejectingReport(null);
      setRejectionNotes('');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Failed to update report.', variant: 'destructive' });
      // Still close modals and reset state
      setIsModalOpen(false);
      setSelectedReport(null);
      setIsRejectingReport(null);
      setRejectionNotes('');
    },
  });

  const handleReportStatusUpdate = (reportId: string, newStatus: ReportStatus, notes?: string) => {
    updateReportMutation.mutate({ reportId, newStatus, notes });
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
    refetch,
    isUpdating: updateReportMutation.isPending,
  };
};
