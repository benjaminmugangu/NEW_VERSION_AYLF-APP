// src/app/dashboard/certificates/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ROLES, APP_NAME } from "@/lib/constants";
import type { RosterMember } from "@/services/certificateService";
import { useCertificates } from "@/hooks/useCertificates";
import { Award, Printer, UserSquare2, ListFilter, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PrintableCertificate } from "./components/PrintableCertificate";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";

export default function CertificatesPage() {
  const [selectedUserForCertificate, setSelectedUserForCertificate] = useState<RosterMember | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const { 
    roster: coordinatorsAndLeaders, 
    isLoading, 
    error, 
    dateFilter, 
    setDateFilter 
  } = useCertificates();

  const handleGenerateCertificate = (user: RosterMember) => {
    setSelectedUserForCertificate(user);
    setIsCertificateModalOpen(true);
  };

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
      printWindow.document.write(`<div class="filter-info">Report Period: ${dateFilter.display}</div>`);
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
    <>
      <PageHeader
        title="Coordinator & Leader Certificates"
        description={`Generate certificates of service. Filter: ${dateFilter.display}`}
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
              <DateRangeFilter onFilterChange={setDateFilter} initialRangeKey={dateFilter.rangeKey} />
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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-red-500">{error}</TableCell>
                  </TableRow>
                ) : coordinatorsAndLeaders.length > 0 ? coordinatorsAndLeaders.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.roleDisplayName}</TableCell>
                    <TableCell>{user.entityName}</TableCell>
                    <TableCell>{user.mandateStartDate ? format(parseISO(user.mandateStartDate), "PP") : "N/A"}</TableCell>
                    <TableCell>{user.mandateEndDate ? format(parseISO(user.mandateEndDate), "PP") : "Present"}</TableCell>
                    <TableCell>
                      <Badge variant={user.mandateStatus === 'Past' ? "outline" : "default"} className="capitalize">
                        {user.mandateStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right no-print">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleGenerateCertificate(user)}
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
                    entityName={selectedUserForCertificate.entityName}
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
                          .certificate-container { border: 6px double hsl(var(--primary)); padding: 20mm; text-align: center; background-color: hsl(var(--background)); position: relative; width: 267mm; height: 180mm; margin: auto; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
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
    </>
  );
}
