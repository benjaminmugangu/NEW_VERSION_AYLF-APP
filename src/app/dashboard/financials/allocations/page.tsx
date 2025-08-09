'use client';

import React from 'react';
import { useAllocations } from '@/hooks/useAllocations'; // Assuming this hook exists or will be created
import { columns } from '@/components/financials/allocations/columns'; // Assuming this will be created
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

const AllocationsListPage = () => {
  const { allocations, isLoading, error } = useAllocations();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fund Allocations</h1>
        <Button asChild>
          <Link href="/dashboard/financials/allocations/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Allocation
          </Link>
        </Button>
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
