'use client';

'use client';

import { ColumnDef, Table, Row, Column } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, FileAxis3d } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { FinancialTransaction } from '@/lib/types';
import { format } from 'date-fns';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const columns: ColumnDef<FinancialTransaction>[] = [
  {
    id: 'select',
    header: ({ table }: { table: Table<FinancialTransaction> }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: { row: Row<FinancialTransaction> }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'date',
    header: ({ column }: { column: Column<FinancialTransaction, unknown> }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }: { row: Row<FinancialTransaction> }) => format(new Date(row.getValue('date')), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }: { row: Row<FinancialTransaction> }) => {
      const transaction = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{transaction.description}</span>
          {transaction.relatedReportId && (
            <Link
              href={`/dashboard/reports/${transaction.relatedReportId}`}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
              <FileAxis3d className="h-3 w-3" />
              {transaction.relatedReportTitle || 'Voir rapport'}
            </Link>
          )}
        </div>
      );
    }
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }: { row: Row<FinancialTransaction> }) => {
      const type = row.getValue('type') as string;
      const variant = type === 'income' ? 'default' : 'destructive';
      return <Badge variant={variant}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }: { row: Row<FinancialTransaction> }) => {
      const amount = parseFloat(row.getValue('amount'));
      const type = row.getValue('type') as string;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', // TODO: Make this dynamic based on user settings
      }).format(amount);

      return <div className={`text-right font-medium ${type === 'income' ? 'text-green-600' : ''}`}>{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }: { row: Row<FinancialTransaction> }) => {
      const transaction = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(transaction.id)}
            >
              Copy Transaction ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit Transaction</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete Transaction</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
