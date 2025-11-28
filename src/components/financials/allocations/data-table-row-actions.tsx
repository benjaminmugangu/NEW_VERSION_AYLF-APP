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
import { FundAllocation } from '@/lib/types';
import * as allocationService from "@/services/allocations.service";
import { useToast } from '@/hooks/use-toast';

interface DataTableRowActionsProps {
  row: Row<FundAllocation>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const allocation = row.original as FundAllocation;
  const { toast } = useToast();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this allocation?')) {
      try {
        await allocationService.deleteAllocation(allocation.id);
        toast({ title: 'Success', description: 'Allocation deleted successfully.' });
        window.location.reload(); // Simple refresh for now
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete allocation.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
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
