'use client';

import { Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { FinancialTransaction } from '@/lib/types';
import { transactionService } from '@/services/transactionService';
import { useToast } from '@/hooks/use-toast';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
  const transaction = row.original as FinancialTransaction;
  const { toast } = useToast();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      const response = await transactionService.deleteTransaction(transaction.id);
      if (response.success) {
        toast({ title: 'Success', description: 'Transaction deleted successfully.' });
        // This requires a way to trigger a refetch in the parent component, 
        // which can be done via a passed prop or a global state management solution.
        // For now, we'll rely on the user to manually refresh.
        window.location.reload();
      } else {
        toast({ title: 'Error', description: response.error?.message || 'Failed to delete transaction.', variant: 'destructive' });
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/financials/transactions/edit/${transaction.id}`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-red-500">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
