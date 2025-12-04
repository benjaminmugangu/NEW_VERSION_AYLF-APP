'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { useAllocations } from '@/hooks/useAllocations'; // Assuming this hook exists or will be created
import { columns } from '@/components/financials/allocations/columns'; // Assuming this will be created
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download } from 'lucide-react';
import Link from 'next/link';

const AllocationsListPage = () => {
  const { allocations, isLoading, error } = useAllocations();

  const handleExportCSV = () => {
    window.open('/api/exports/allocations', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fund Allocations</h1>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button asChild>
            <Link href="/dashboard/financials/allocations/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Allocation
            </Link>
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={allocations || []}
        isLoading={isLoading}
        error={error}
        filterColumnId="siteName"
        filterPlaceholder="Filter by entity..."
      />
    </div>
  );
};

export default AllocationsListPage;
