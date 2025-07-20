// src/components/financials/RecentTransactionsTable.tsx
'use client';

import React from 'react';
import type { FinancialTransaction } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RecentTransactionsTableProps {
  transactions: FinancialTransaction[];
}

export const RecentTransactionsTable: React.FC<RecentTransactionsTableProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return <p>No recent transactions.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
            <TableCell>{transaction.description}</TableCell>
            <TableCell>
              <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                {transaction.type}
              </Badge>
            </TableCell>
            <TableCell className={cn(
              'text-right font-medium',
              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
            )}>
              {formatCurrency(transaction.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
