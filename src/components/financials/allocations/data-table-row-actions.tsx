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
import { Allocation } from '@/lib/types';
import { allocationService } from "@/services/allocations.service";
import { useToast } from '@/hooks/use-toast';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({ row }: DataTableRowActionsProps<TData>) {
  const allocation = row.original as Allocation;
  const { toast } = useToast();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this allocation?')) {
      const response = await allocationService.deleteAllocation(allocation.id);
      if (response.success) {
        toast({ title: 'Success', description: 'Allocation deleted successfully.' });
        window.location.reload(); // Simple refresh for now
      } else {
        toast({ title: 'Error', description: response.error?.message || 'Failed to delete allocation.', variant: 'destructive' });
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
          <Link href={`/dashboard/financials/allocations/edit/${allocation.id}`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-red-500">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
