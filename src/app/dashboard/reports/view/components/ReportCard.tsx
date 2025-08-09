// src/app/dashboard/reports/view/components/ReportCard.tsx
"use client";

import type { ReportWithDetails } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, UserCircle, CalendarDays, Tag, Hash, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react"; // Added Tag for activity type, Hash for thematic
import Image from "next/image";
import { format } from "date-fns";

interface ReportCardProps {
  report: ReportWithDetails;
  onViewDetails: (reportId: string) => void;
}

export function ReportCard({ report, onViewDetails }: ReportCardProps) {
  const getLevelBadgeColor = (level: ReportWithDetails["level"]) => {
    switch(level) {
      case "national": return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      case "site": return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      case "small_group": return "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  }

  const getStatusBadgeInfo = (status: ReportWithDetails["status"]) => {
    switch (status) {
      case "approved":
        return { variant: "default", icon: <CheckCircle className="mr-1 h-3 w-3" />, text: "Approved", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700" };
      case "rejected":
        return { variant: "destructive", icon: <XCircle className="mr-1 h-3 w-3" />, text: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-300 dark:border-red-700" };
      case "submitted":
      default:
        return { variant: "secondary", icon: <AlertCircle className="mr-1 h-3 w-3" />, text: "Submitted", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700" };
    }
  };
  
  const statusInfo = getStatusBadgeInfo(report.status);


  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
      {report.images && report.images.length > 0 && (
        <div className="relative w-full h-40 overflow-hidden rounded-t-lg">
          <Image 
            src={report.images[0].url} 
            alt={report.images[0].name} 
            layout="fill" 
            objectFit="cover" 
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="report image"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-1">
            <CardTitle className="text-base font-semibold leading-tight line-clamp-2">{report.title}</CardTitle>
             <Badge variant="outline" className={`${getLevelBadgeColor(report.level)} border-none text-xs px-1.5 py-0.5`}>
                {report.level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
        </div>
         <div className="flex items-center mt-1">
            <Badge variant={statusInfo.variant as any} className={`${statusInfo.className} text-xs px-1.5 py-0.5 flex items-center`}>
                {statusInfo.icon}
                {statusInfo.text}
            </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground space-y-0.5 pt-1">
          <div className="flex items-center"><CalendarDays className="mr-1.5 h-3 w-3" />Activity Date: {format(new Date(report.activityDate), "PP")}</div>
          <div className="flex items-center"><Tag className="mr-1.5 h-3 w-3" />Type: {report.activityTypeName || 'N/A'}</div>
          <div className="flex items-center truncate"><Hash className="mr-1.5 h-3 w-3" />Theme: {report.thematic}</div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2 pb-3">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{report.content}</p>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
            {report.participantsCountReported !== undefined && (
                <span className="flex items-center"><Users className="mr-1 h-3 w-3" /> {report.participantsCountReported} Participants</span>
            )}
            <span className="flex items-center"><UserCircle className="mr-1 h-3 w-3" /> By: {report.submittedByName || 'N/A'}</span>
            <span className="flex items-center"><CalendarDays className="mr-1 h-3 w-3" />Submitted: {new Date(report.submissionDate).toLocaleDateString()}</span>
        </div>
         {report.financialSummary && (
            <div className="mt-1.5 pt-1.5 border-t border-dashed">
                <h4 className="text-xs font-semibold text-foreground">Financial Summary:</h4>
                <p className="text-xs text-muted-foreground line-clamp-1">{report.financialSummary}</p>
            </div>
        )}
         {report.totalExpenses !== undefined && report.totalExpenses > 0 && (
             <div className="mt-1 text-xs text-muted-foreground">
                Total Expenses: <span className="font-medium text-foreground">{report.totalExpenses.toLocaleString()} {report.currency}</span>
            </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 pb-3">
        <Button onClick={() => onViewDetails(report.id)} variant="outline" size="sm" className="w-full">
          <Eye className="mr-2 h-4 w-4" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );
}

