'use client';

import React from 'react';
import { columns } from '@/components/financials/reports/columns';
import { DataTable } from '@/components/shared/DataTable';
import { ReportWithDetails } from '@/lib/types';

interface FinancialReportsClientProps {
  reports: ReportWithDetails[];
}

const FinancialReportsClient: React.FC<FinancialReportsClientProps> = ({ reports }) => {
  const reportsWithExpenses = React.useMemo(() => {
    return reports?.filter(report => (report.totalExpenses ?? 0) > 0) || [];
  }, [reports]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reports with Declared Expenses</h1>
      </div>
      <DataTable
        columns={columns}
        data={reportsWithExpenses}
        isLoading={false} // Data is pre-loaded by the server component
        error={null} // Error is handled by the server component
        filterColumnId="title"
        filterPlaceholder="Filter by report title..."
      />
    </div>
  );
};

export default FinancialReportsClient;
