'use client';

import React from 'react';
import { useReports } from '@/hooks/useReports';
import { columns } from '@/components/financials/reports/columns'; // Assuming this will be created
import { DataTable } from '../../../../components/shared/DataTable';

const FinancialReportsPage = () => {
  const { reports, isLoading, error } = useReports();

  // Filter for reports that have expenses
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
        isLoading={isLoading}
        error={error}
        filterColumnId="title"
        filterPlaceholder="Filter by report title..."
      />
    </div>
  );
};

export default FinancialReportsPage;
