'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Report } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTableRowActions } from './data-table-row-actions';

export const columns: ColumnDef<Report>[] = [
  {
    accessorKey: 'title',
    header: 'Report Title',
  },
  {
    accessorKey: 'totalExpenses',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-right w-full"
        >
          Total Expenses
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalExpenses'));
      return <div className="text-right font-medium text-red-500">{formatCurrency(amount)}</div>;
    },
  },
  {
    accessorKey: 'activityDate',
    header: 'Activity Date',
    cell: ({ row }) => {
      return <span>{formatDate(row.getValue('activityDate'))}</span>;
    },
  },
    {
    accessorKey: 'siteName',
    header: 'Entity',
     cell: ({ row }) => {
        const report = row.original;
        return <span>{report.siteName || report.smallGroupName || 'N/A'}</span>
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
