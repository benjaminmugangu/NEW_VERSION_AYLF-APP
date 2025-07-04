// src/components/shared/skeletons/ReportsPageSkeleton.tsx
import React from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { TableRowSkeleton } from './TableRowSkeleton';
import { FileSearch } from 'lucide-react';

export function ReportsPageSkeleton() {
  return (
    <>
      <PageHeader 
        title="View Reports"
        description="Loading report data... Please wait."
        icon={FileSearch}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Skeleton className="h-10 w-full sm:w-64" />
            <div className="flex w-full sm:w-auto items-center gap-2">
              <Skeleton className="h-10 w-full sm:w-48" />
              <Skeleton className="h-10 w-full sm:w-48" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]"><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className="w-[15%]"><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className="w-[15%]"><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className="w-[15%]"><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className="w-[15%]"><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className="w-[15%]"><Skeleton className="h-6 w-full" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRowSkeleton 
                  colSpan={6} 
                  rowCount={8}
                  cellWidths={['w-[25%]', 'w-[15%]', 'w-[15%]', 'w-[15%]', 'w-[15%]', 'w-[15%]']}
                />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
