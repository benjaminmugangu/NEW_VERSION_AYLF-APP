
// src/app/dashboard/certificates/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RoleBasedGuard } from "@/components/shared/RoleBasedGuard";
import { ROLES, APP_NAME } from "@/lib/constants";
import { mockUsers, mockSites, mockSmallGroups } from "@/lib/mockData";
import type { User } from "@/lib/types";
import { Award, Printer, UserSquare2, ListFilter, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PrintableCertificate } from "./components/PrintableCertificate";
import { Badge } from "@/components/ui/badge";
import { 
  format, 
  startOfYear, 
  endOfYear, 
  startOfMonth, 
  endOfMonth, 
  subWeeks, 
  startOfWeek, 
  endOfWeek,
  subDays,
  isValid,
  parseISO,
  startOfDay, 
  endOfDay 
} from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReportPeriodType = "all_time" | "specific_year" | "specific_month" | "last_week" | "last_7_days" | "last_30_days";

const REPORT_PERIOD_OPTIONS: { value: ReportPeriodType; label: string }[] = [
  { value: "all_time", label: "All Time" },
  { value: "specific_year", label: "Specific Year" },
  { value: "specific_month", label: "Specific Month" },
  { value: "last_week", label: "Last Week" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
];

const generateYearOptions = () => {
  const options = [];
  const maxYear = 2028; 
  const minYear = 2014; 
  for (let year = maxYear; year >= minYear; year--) {
    options.push({ value: year.toString(), label: year.toString() });
  }
  return options;
};
const YEAR_OPTIONS = generateYearOptions();

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: (i).toString(), 
  label: format(new Date(0, i), "MMMM"),
}));

export default function CertificatesPage() {
  const [selectedUserForCertificate, setSelectedUserForCertificate] = useState<User | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  
  const [reportPeriodType, setReportPeriodType] = useState<ReportPeriodType>("all_time");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());

  const coordinatorsAndLeaders = useMemo(() => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const now = new Date();

    switch (reportPeriodType) {
      case "specific_year":
        const yearNum = parseInt(selectedYear, 10);
        if (!isNaN(yearNum)) {
          startDate = startOfYear(new Date(yearNum, 0, 1));
          endDate = endOfYear(new Date(yearNum, 0, 1));
        }
        break;
      case "specific_month":
        const yearForMonth = parseInt(selectedYear, 10);
        const monthNum = parseInt(selectedMonth, 10);
        if (!isNaN(yearForMonth) && !isNaN(monthNum)) {
          startDate = startOfMonth(new Date(yearForMonth, monthNum, 1));
          endDate = endOfMonth(new Date(yearForMonth, monthNum, 1));
        }
        break;
      case "last_week":
        startDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        endDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case "last_7_days":
        startDate = subDays(now, 6); 
        endDate = now; 
        break;
      case "last_30_days":
        startDate = subDays(now, 29); 
        endDate = now; 
        break;
      case "all_time":
      default:
        // No date filtering
        break;
    }
    
    if(startDate) startDate = startOfDay(startDate);
    if(endDate) endDate = endOfDay(endDate);


    return mockUsers.filter(user => {
      const isLeaderOrCoordinator = user.role === ROLES.SITE_COORDINATOR || user.role === ROLES.SMALL_GROUP_LEADER;
      if (!isLeaderOrCoordinator) return false;
      if (!user.mandateStartDate) return false; 

      if (!startDate || !endDate) return true; 

      const mandateStart = parseISO(user.mandateStartDate);
      const mandateEnd = user.mandateEndDate ? parseISO(user.mandateEndDate) : now;

      if (!isValid(mandateStart) || !isValid(mandateEnd)) return false;

      return mandateStart <= endDate && mandateEnd >= startDate;
    })
    .sort((a,b) => (a.mandateEndDate ? 1 : -1) - (b.mandateEndDate ? 1: -1) || new Date(b.mandateStartDate || 0).getTime() - new Date(a.mandateStartDate || 0).getTime());
  }, [reportPeriodType, selectedYear, selectedMonth]);

  const getEntityName = (user: User): string => {
    if (user.role === ROLES.SITE_COORDINATOR && user.siteId) {
      return mockSites.find(s => s.id === user.siteId)?.name || "Unknown Site";
    }
    if (user.role === ROLES.SMALL_GROUP_LEADER && user.smallGroupId) {
      const sg = mockSmallGroups.find(s => s.id === user.smallGroupId);
      if (sg) {
        const site = mockSites.find(s => s.id === sg.siteId);
        return `${sg.name}${site ? ` (${site.name})` : ''}`;
      }
      return "Unknown Small Group";
    }
    return "N/A";
  };

  const handleGenerateCertificate = (user: User) => {
    setSelectedUserForCertificate(user);
    setIsCertificateModalOpen(true);
  };
  
  const getRoleDisplayName = (role: User["role"]) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const getCurrentFilterDisplay = () => {
    const option = REPORT_PERIOD_OPTIONS.find(opt => opt.value === reportPeriodType);
    let display = option ? option.label : "All Time";
    if (reportPeriodType === 'specific_year') display += `: ${selectedYear}`;
    if (reportPeriodType === 'specific_month') display += `: ${MONTH_OPTIONS.find(m=>m.value === selectedMonth)?.label} ${selectedYear}`;
    return display;
  }

  const handlePrintRoster = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Coordinator & Leader Roster</title>');
      printWindow.document.write(`
        <style>
          @media print {
            @page { size: A4 landscape; margin: 20mm; }
            body { font-family: Arial, sans-serif; font-size: 10pt; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
            th { background-color: #eee; font-weight: bold; }
            h1 { text-align: center; font-size: 16pt; margin-bottom: 5px; }
            .filter-info { text-align: center; margin-bottom: 15px; font-size: 9pt; color: #555; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .print-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .print-header img { max-height: 75px; }
            .print-footer { position: fixed; bottom: 10mm; left: 20mm; right: 20mm; text-align: center; font-size: 8pt; color: #777; }
          }
          .print-header img { display: none; } 
          .print-footer { display: none; } 
        </style>
      `);
      printWindow.document.write('</head><body>');
      printWindow.document.write(`<div class="print-header print-only"><img src="https://picsum.photos/seed/aylflogo/150/75" alt="AYLF Logo" data-ai-hint="organization logo"><span>${APP_NAME}</span></div>`);
      printWindow.document.write(`<h1>Coordinator & Leader Roster</h1>`);
      printWindow.document.write(`<div class="filter-info">Report Period: ${getCurrentFilterDisplay()}</div>`);
      const tableContent = document.getElementById('roster-table')?.outerHTML;
      if (tableContent) {
        printWindow.document.write(tableContent);
      } else {
        printWindow.document.write('<p>No data to print.</p>');
      }
      printWindow.document.write(`<div class="print-footer print-only">Generated on: ${new Date().toLocaleDateString()} &copy; ${APP_NAME}</div>`);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };


  return (
    <RoleBasedGuard allowedRoles={[ROLES.NATIONAL_COORDINATOR]}>
      <PageHeader
        title="Coordinator & Leader Certificates"
        description={`Generate certificates of service. Filter: ${getCurrentFilterDisplay()}`}
        icon={Award}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Coordinator & Leader Roster</CardTitle>
              <CardDescription>
                List of individuals who have served or are currently serving in leadership roles.
              </CardDescription>
            </div>
             <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                <Select value={reportPeriodType} onValueChange={(value) => setReportPeriodType(value as ReportPeriodType)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Filter by period" />
                    </SelectTrigger>
                    <SelectContent>
                        {REPORT_PERIOD_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(reportPeriodType === "specific_year" || reportPeriodType === "specific_month") && (
                     <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full sm:w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {YEAR_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {reportPeriodType === "specific_month" && (
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTH_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                 <Button onClick={handlePrintRoster} variant="outline" className="w-full sm:w-auto">
                    <Printer className="mr-2 h-4 w-4" /> Print Roster
                 </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto" id="roster-table-container">
            <Table id="roster-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Entity Assignment</TableHead>
                  <TableHead>Mandate Start</TableHead>
                  <TableHead>Mandate End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right no-print">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coordinatorsAndLeaders.length > 0 ? coordinatorsAndLeaders.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{getRoleDisplayName(user.role)}</TableCell>
                    <TableCell>{getEntityName(user)}</TableCell>
                    <TableCell>{user.mandateStartDate ? format(parseISO(user.mandateStartDate), "PP") : "N/A"}</TableCell>
                    <TableCell>{user.mandateEndDate ? format(parseISO(user.mandateEndDate), "PP") : "Present"}</TableCell>
                    <TableCell>
                      <Badge variant={user.mandateEndDate ? "outline" : "default"} className="capitalize">
                        {user.mandateEndDate ? "Past" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right no-print">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleGenerateCertificate(user)}
                        disabled={!user.mandateStartDate} 
                      >
                        <UserSquare2 className="mr-2 h-4 w-4" /> Generate Certificate
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      No coordinators or leaders found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUserForCertificate && (
        <Dialog open={isCertificateModalOpen} onOpenChange={setIsCertificateModalOpen}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-[900px] p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>Certificate of Service for {selectedUserForCertificate.name}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto"> 
                <PrintableCertificate 
                    user={selectedUserForCertificate} 
                    entityName={getEntityName(selectedUserForCertificate)}
                    appName={APP_NAME} 
                />
            </div>
            <DialogFooter className="p-6 bg-muted border-t no-print">
              <Button variant="outline" onClick={() => setIsCertificateModalOpen(false)}>Close</Button>
              <Button onClick={() => {
                  const printableContent = document.getElementById('certificate-content');
                  if (printableContent) {
                    const printWindow = window.open('', '_blank');
                    if(printWindow) {
                        printWindow.document.write('<html><head><title>Print Certificate</title>');
                        printWindow.document.write(`
                        <style>
                          @page { size: A4 portrait; margin: 15mm; }
                          body { margin: 0; font-family: "Times New Roman", Times, serif; color: #333; }
                          .certificate-container { border: 6px double hsl(var(--primary)); padding: 25mm; text-align: center; background-color: hsl(var(--background)); position: relative; width: 180mm; height: 267mm; margin: auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
                          .logo { border-radius: 9999px; margin-bottom: 10mm; width: 30mm; height: 30mm; object-fit: contain; }
                          .title { font-size: 24pt; font-weight: bold; color: hsl(var(--primary)); margin-bottom: 5mm; text-transform: uppercase; letter-spacing: 1px;}
                          .subtitle { font-size: 14pt; color: hsl(var(--muted-foreground)); margin-bottom: 15mm; }
                          .presented-to { font-size: 12pt; margin-bottom: 2mm; }
                          .user-name { font-size: 20pt; font-weight: bold; color: hsl(var(--foreground)); margin-bottom: 8mm; }
                          .service-as { font-size: 11pt; margin-bottom: 2mm; }
                          .role-entity { font-size: 14pt; font-weight: bold; color: hsl(var(--primary)); margin-bottom: 8mm; }
                          .period { font-size: 11pt; margin-bottom: 15mm; }
                          .signatures { margin-top: 20mm; display: flex; justify-content: space-around; align-items: flex-end; width: 100%; }
                          .signatures > div { width: 45%; text-align: center; }
                          .signature-line { border-top: 1px solid hsl(var(--foreground)); width: 100%; margin: 0 auto 2mm auto; }
                          .signature-title { font-size: 10pt; color: hsl(var(--muted-foreground)); }
                          .footer-text { font-size: 8pt; color: hsl(var(--muted-foreground)); margin-top: 15mm; }
                          .decorative-corner { display: none; } 

                          /* Ensure primary and other theme colors are applied in print */
                          :root {
                            --background: 240 5.9% 95%; --foreground: 240 5.9% 10%; --card: 0 0% 100%; --card-foreground: 240 5.9% 10%; --popover: 0 0% 100%; --popover-foreground: 240 5.9% 10%; --primary: 100 60% 29%; --primary-foreground: 0 0% 100%; --secondary: 240 4.8% 90%; --secondary-foreground: 240 5.9% 20%; --muted: 240 4.8% 85%; --muted-foreground: 240 3.8% 46.1%; --accent: 180 100% 25%; --accent-foreground: 0 0% 100%; --destructive: 0 84.2% 60.2%; --destructive-foreground: 0 0% 98%; --border: 240 5.9% 89.8%; --input: 240 5.9% 93%; --ring: 100 60% 35%;
                          }
                          /* Force background colors and images to print */
                          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        </style>
                        `);
                        printWindow.document.write('</head><body>');
                        printWindow.document.write(printableContent.innerHTML);
                        printWindow.document.write('</body></html>');
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                    }
                  }
              }}>
                <Printer className="mr-2 h-4 w-4"/> Print / Export to PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </RoleBasedGuard>
  );
}
