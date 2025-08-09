// src/app/dashboard/reports/view/page.tsx
"use client";

import React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReportTable } from "./components/ReportTable";
import { ReportCard } from "./components/ReportCard";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSearch, Search, LayoutGrid, List, Building, Users as UsersIconLucide, Globe, ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle, UserCheck, Calendar, Send, User, Bookmark, DollarSign, Users } from "lucide-react";
import type { ReportStatus, ReportWithDetails } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ReportsPageSkeleton } from "@/components/shared/skeletons/ReportsPageSkeleton";
import { useReports } from "@/hooks/useReports";

export default function ViewReportsPage() {
  const { currentUser } = useAuth();
  const {
    reports,
    isLoading,
    error,
    filters,
    view,
    modal,
    actions,
    pageDescription,
  } = useReports();

  const getReportContextName = (report: ReportWithDetails): string => {
    if (report.level === 'site') return `Site: ${report.site?.name || 'N/A'}`;
    if (report.level === 'small_group') return `Small Group: ${report.smallGroup?.name || 'N/A'}`;
    if (report.level === 'national') return 'National Report';
    return 'Report';
  };

  const getLevelIcon = (level: ReportWithDetails["level"]) => {
    switch (level) {
      case "national": return Globe;
      case "site": return Building;
      case "small_group": return UsersIconLucide;
      default: return FileSearch;
    }
  };

  const getStatusBadgeInfo = (status?: ReportStatus) => {
    switch (status) {
      case "approved": return { variant: "success", icon: UserCheck, label: "Approved" } as const;
      case "rejected": return { variant: "destructive", icon: ThumbsDown, label: "Rejected" } as const;
      case "pending":
      case "submitted":
      default: return { variant: "secondary", icon: MessageSquare, label: "Pending" } as const;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <ReportsPageSkeleton />;
    }

    if (error) {
      return <p className="text-center text-destructive py-8">Error: {error}</p>;
    }

    if (reports.length === 0) {
      return <p className="text-center text-muted-foreground py-8">No reports found matching your criteria.</p>;
    }

    if (view.viewMode === "table" && !view.isMobile) {
      return <ReportTable reports={reports} onViewDetails={actions.handleViewDetails} />;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {reports.map(report => (
          <ReportCard key={report.id} report={report} onViewDetails={actions.handleViewDetails} />
        ))}
      </div>
    );
  };

  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR, ROLES.SITE_COORDINATOR, ROLES.SMALL_GROUP_LEADER]}>
      <PageHeader 
        title="View Submitted Reports"
        description={pageDescription}
        icon={FileSearch}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Browse and manage all submitted reports.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={view.viewMode === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => actions.setViewMode('grid')}>
                <LayoutGrid className="h-4 w-4"/>
              </Button>
              <Button variant={view.viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => actions.setViewMode('table')} className="hidden sm:flex">
                <List className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, context..."
                value={filters.searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(['pending', 'submitted', 'approved', 'rejected'] as ReportStatus[]).map(status => (
                    <Button
                      key={status}
                      variant={filters.statusFilter[status] ? "default" : "outline"}
                      size="sm"
                      onClick={() => actions.setStatusFilter(prev => ({ ...prev, [status]: !prev[status] }))}
                      className="capitalize text-xs h-8"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Date Range</p>
                <DateRangeFilter 
                  onFilterChange={actions.setDateFilter} 
                  initialRangeKey={filters.dateFilter.rangeKey}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        {renderContent()}
      </div>

      {modal.selectedReport && (
        <Dialog open={modal.isModalOpen} onOpenChange={(isOpen) => { if (!isOpen) actions.closeModal(); }}>
          <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
            <ScrollArea className="flex-grow">
              <div className="p-6 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">{modal.selectedReport.title}</DialogTitle>
                  <DialogDescription>
                    {getReportContextName(modal.selectedReport)}
                  </DialogDescription>
                </DialogHeader>

                {modal.selectedReport.reviewNotes && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5"/>
                      <div>
                        <h4 className="font-semibold text-destructive">Rejection Notes</h4>
                        <p className="text-sm text-destructive/80 whitespace-pre-wrap">{modal.selectedReport.reviewNotes}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Activity Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Type:</span> <span>{modal.selectedReport.activityTypeName || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Date:</span> <span>{format(new Date(modal.selectedReport.activityDate), 'PPP')}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Status:</span> <Badge variant={getStatusBadgeInfo(modal.selectedReport.status).variant}>{getStatusBadgeInfo(modal.selectedReport.status).label}</Badge></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Author</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-6 h-6 text-muted-foreground"/>
                        </div>
                        <div>
                          <p className="font-semibold">{modal.selectedReport.submittedByUser?.name || modal.selectedReport.submittedByName || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{modal.selectedReport.submittedByUser?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Attendance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Girls:</span> <span>{modal.selectedReport.girlsCount ?? 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Boys:</span> <span>{modal.selectedReport.boysCount ?? 'N/A'}</span></div>
                        <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold">Total Reported:</span> <span className="font-bold">{modal.selectedReport.participantsCountReported ?? 'N/A'}</span></div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Financials</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Total Expenses:</span> <span>{(modal.selectedReport.totalExpenses ?? 0).toLocaleString()} {modal.selectedReport.currency || ''}</span></div>
                        {modal.selectedReport.financialSummary && <div className="pt-2"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{modal.selectedReport.financialSummary}</p></div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2">Report Content</h4>
                  <div className="prose prose-sm max-w-none p-3 border rounded-md bg-muted/50" dangerouslySetInnerHTML={{ __html: modal.selectedReport.content || "<p>No content provided.</p>" }} />
                </div>

                {modal.selectedReport.images && modal.selectedReport.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Attached Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {modal.selectedReport.images.map((image, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden border group shadow-sm">
                          <Image src={image.url} alt={image.name} fill style={{objectFit: 'cover'}} className="group-hover:scale-105 transition-transform duration-300"/>
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a href={image.url} target="_blank" rel="noopener noreferrer" className="text-white text-xs bg-black/70 px-2 py-1 rounded-sm hover:bg-black/90">View Full Image</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="mt-auto pt-4 border-t items-center">
              {currentUser?.role === ROLES.NATIONAL_COORDINATOR && modal.selectedReport.status === 'pending' && (
                <div className="mr-auto flex gap-2">
                  <Button 
                      variant="outline" 
                      className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                      onClick={() => actions.handleReportStatusUpdate(modal.selectedReport!.id, "approved")}
                    >
                      <ThumbsUp className="mr-2 h-4 w-4"/> Approve
                  </Button>
                  <AlertDialog onOpenChange={(open) => !open && actions.setIsRejectingReport(null)}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => actions.setIsRejectingReport(modal.selectedReport)} 
                      >
                        <ThumbsDown className="mr-2 h-4 w-4"/> Reject
                      </Button>
                    </AlertDialogTrigger>
                    {modal.isRejectingReport && (
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Report: "{modal.isRejectingReport.title}"</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please provide a reason for rejecting this report. These notes will be visible to the submitter.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Textarea 
                          placeholder="Enter rejection notes here..."
                          value={modal.rejectionNotes}
                          onChange={(e) => actions.setRejectionNotes(e.target.value)}
                          rows={4}
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => actions.setRejectionNotes('')}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={actions.confirmRejectReport} disabled={!modal.rejectionNotes.trim()}>Confirm Rejection</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    )}
                  </AlertDialog>
                </div>
              )}
              <Button variant="outline" onClick={actions.closeModal}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </RoleBasedGuard>
  );
}
