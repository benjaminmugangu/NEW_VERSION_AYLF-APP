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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSearch, Search, LayoutGrid, List, Building, Users as UsersIconLucide, Globe, ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle, UserCheck } from "lucide-react";
import type { ReportStatus, ReportWithDetails } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReportsPageSkeleton } from "@/components/shared/skeletons/ReportsPageSkeleton";
import { useReports } from "@/hooks/useReports";



export default function ViewReportsPage() {
  const { currentUser } = useAuth(); // Retained for role-based action visibility
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
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Report Explorer</CardTitle>
          <CardDescription>Filter and search for reports. Toggle between table and grid view.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, context..."
                value={filters.searchTerm}
                onChange={(e) => actions.setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <DateRangeFilter onFilterChange={actions.setDateFilter} initialRangeKey={filters.dateFilter.rangeKey} />
              <Select value={filters.statusFilter} onValueChange={(value) => actions.setStatusFilter(value as ReportStatus | "all")}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {!view.isMobile && (
                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                  <Button variant={view.viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" onClick={() => actions.setViewMode('table')} className="h-8 w-8">
                    <List className="h-5 w-5" />
                  </Button>
                  <Button variant={view.viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => actions.setViewMode('grid')} className="h-8 w-8">
                    <LayoutGrid className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {renderContent()}
        </CardContent>
      </Card>

      {modal.selectedReport && (
        <Dialog open={modal.isModalOpen} onOpenChange={(isOpen) => { if (!isOpen) actions.closeModal(); }}>
          <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                {React.createElement(getLevelIcon(modal.selectedReport.level), { className: "h-6 w-6 text-primary" })}
                {modal.selectedReport.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground pt-2">
                  <span>By: <span className="font-medium text-foreground">{modal.selectedReport.submittedByUser?.name || 'N/A'}</span></span>
                  <Separator orientation="vertical" className="h-4"/>
                  <span>On: <span className="font-medium text-foreground">{format(new Date(modal.selectedReport.submissionDate), "PPP")}</span></span>
                  <Separator orientation="vertical" className="h-4"/>
                  <Badge variant={getStatusBadgeInfo(modal.selectedReport.status).variant} className="flex items-center gap-1.5">
                    {React.createElement(getStatusBadgeInfo(modal.selectedReport.status).icon, { className: "h-3.5 w-3.5" })}
                    {getStatusBadgeInfo(modal.selectedReport.status).label}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-grow px-6">
              <div className="space-y-6 py-6">
                {modal.selectedReport.reviewNotes && (
                  <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
                    <h4 className="font-semibold flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/> Rejection Notes</h4>
                    <p className="mt-1 text-sm">{modal.selectedReport.reviewNotes}</p>
                  </div>
                )}
                
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Context</dt>
                  <dd className="font-medium">{getReportContextName(modal.selectedReport)}</dd>
                  <dt className="text-muted-foreground">Activity Date</dt>
                  <dd className="font-medium">{format(new Date(modal.selectedReport.activityDate), "PPP")}</dd>
                  <dt className="text-muted-foreground">Activity Type</dt>
                  <dd className="font-medium">{modal.selectedReport.activityType?.name || 'N/A'}</dd>
                  <dt className="text-muted-foreground">Thematic Area</dt>
                  <dd className="font-medium">{modal.selectedReport.thematic}</dd>
                  {modal.selectedReport.speaker && <><dt className="text-muted-foreground">Speaker</dt><dd className="font-medium">{modal.selectedReport.speaker}</dd></>}
                  {modal.selectedReport.moderator && <><dt className="text-muted-foreground">Moderator</dt><dd className="font-medium">{modal.selectedReport.moderator}</dd></>}
                </dl>

                <div>
                  <h4 className="font-semibold text-lg mb-2">Content</h4>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: modal.selectedReport.content }} />
                </div>

                {modal.selectedReport.expenses !== undefined && modal.selectedReport.expenses > 0 && (
                   <div>
                    <h4 className="font-semibold text-lg mb-2">Financial Summary</h4>
                    <p className="text-sm">Total expenses: <span className="font-bold text-base">{new Intl.NumberFormat('en-US', { style: 'currency', currency: modal.selectedReport.currency || 'USD' }).format(modal.selectedReport.expenses)}</span></p>
                    {modal.selectedReport.financialSummary && <div className="prose prose-sm max-w-none mt-2" dangerouslySetInnerHTML={{ __html: modal.selectedReport.financialSummary }} />} 
                  </div>
                )}

                {modal.selectedReport.images && modal.selectedReport.images.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Attached Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {modal.selectedReport.images.map((image, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden border group shadow-sm">
                          <Image src={image.url} alt={image.name} layout="fill" objectFit="cover" className="group-hover:scale-105 transition-transform duration-300"/>
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
