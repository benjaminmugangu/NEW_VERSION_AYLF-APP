// src/app/dashboard/finances/components/ReportList.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Report } from '@/lib/types';

interface ReportListProps {
  reports: Report[];
  title?: string;
  emptyStateMessage?: string;
}

export const ReportList: React.FC<ReportListProps> = ({
  reports,
  title = "Rapports d'activité récents",
  emptyStateMessage = "Aucun rapport d'activité n'a encore été enregistré."
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Liste des dépenses déclarées via les rapports d&apos;activité.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href="/dashboard/reports/view"
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{report.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(report.activityDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'FC', minimumFractionDigits: 0 }).format(report.totalExpenses || 0)}</div>
                    <p className="text-xs text-muted-foreground">Dépensé</p>
                  </div>
                </Link>
              ))}

            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">{emptyStateMessage}</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
