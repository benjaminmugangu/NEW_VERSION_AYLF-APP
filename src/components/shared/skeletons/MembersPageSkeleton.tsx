// src/components/shared/skeletons/MembersPageSkeleton.tsx
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { TableRowSkeleton } from "./TableRowSkeleton";

export const MembersPageSkeleton = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Members"
        description="Loading member data..."
        icon={Users}
        actions={<Skeleton className="h-10 w-36" />} // Skeleton for the 'Add New' button
      />

      {/* Skeleton for the stats chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      {/* Skeleton for the members table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          {/* Filter skeletons */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Skeleton className="h-10 flex-1 min-w-[200px]" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Table skeleton */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-1/4"><Skeleton className="h-6 w-full" /></th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-1/6"><Skeleton className="h-6 w-full" /></th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-1/4"><Skeleton className="h-6 w-full" /></th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-1/4"><Skeleton className="h-6 w-full" /></th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-1/6"><Skeleton className="h-6 w-full" /></th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]"><Skeleton className="h-6 w-full" /></th>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRowSkeleton 
                  colSpan={6} 
                  rowCount={8} // Display 8 skeleton rows
                  cellWidths={['w-1/4', 'w-1/6', 'w-1/4', 'w-1/4', 'w-1/6', 'w-[120px]']}
                />
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
