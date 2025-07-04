// src/components/shared/skeletons/TableRowSkeleton.tsx
"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableRowSkeletonProps {
  colSpan: number;
  cellWidths: string[];
  className?: string;
  rowCount?: number;
}

export const TableRowSkeleton = ({ 
  colSpan, 
  cellWidths, 
  className, 
  rowCount = 1 
}: TableRowSkeletonProps) => {

  if (cellWidths.length !== colSpan) {
    console.warn("TableRowSkeleton: The length of cellWidths should match colSpan.");
    return (
      <TableRow className={className}>
        <TableCell colSpan={colSpan}>
          <Skeleton className="h-6 w-full" />
        </TableCell>
      </TableRow>
    );
  }

  const rows = Array.from({ length: rowCount }).map((_, rowIndex) => (
    <TableRow key={`skeleton-row-${rowIndex}`} className={className}>
      {cellWidths.map((width, cellIndex) => (
        <TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
          <Skeleton className={`h-6 ${width}`} />
        </TableCell>
      ))}
    </TableRow>
  ));

  return <>{rows}</>;
};
