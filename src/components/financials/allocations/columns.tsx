'use client';

import { ColumnDef } from '@tanstack/react-table';
import { FundAllocation } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTableRowActions } from './data-table-row-actions';

export const columns: ColumnDef<FundAllocation>[] = [
  {
    accessorKey: 'siteName',
    header: 'Entity',
    cell: ({ row }) => {
        const allocation = row.original;
        return <span>{allocation.siteName || allocation.smallGroupName || 'N/A'}</span>
    }
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="text-right w-full"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
    },
  },
  {
    accessorKey: 'allocationDate',
    header: 'Date',
    cell: ({ row }) => {
      return <span>{formatDate(row.getValue('allocationDate'))}</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
