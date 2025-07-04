// src/components/shared/skeletons/ActivitiesPageSkeleton.tsx
import React from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableRowSkeleton } from './TableRowSkeleton';
import { Activity } from 'lucide-react';
import { Table, TableBody, TableHeader, TableRow, TableHead } from "@/components/ui/table";

export function ActivitiesPageSkeleton() {
  return (
    <>
      <PageHeader 
        title="Activities" 
        description="Loading activity data... Please wait."
        icon={Activity}
        actions={<Skeleton className="h-10 w-32" />} 
      />

      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-64" /> 
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
                  <TableHead className='w-1/4'><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className='w-1/6'><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className='w-1/6'><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className='w-1/6'><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className='w-1/6'><Skeleton className="h-6 w-full" /></TableHead>
                  <TableHead className='w-1/6'><Skeleton className="h-6 w-full" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRowSkeleton 
                  colSpan={6} 
                  rowCount={5}
                  cellWidths={['w-1/4', 'w-1/6', 'w-1/6', 'w-1/6', 'w-1/6', 'w-1/6']}
                />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
