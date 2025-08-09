// src/app/dashboard/finances/components/RecentTransactions.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { FinancialTransaction } from '@/lib/types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RecentTransactionsProps {
  transactions: FinancialTransaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          The 5 most recent financial movements.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {transactions.slice(0, 5).map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarFallback>{transaction.type === 'income' ? 'IN' : 'EX'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-none">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(transaction.date), 'MMM d, yyyy')} - {transaction.category}
                </p>
              </div>
            </div>
            <div className={`text-right text-sm font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
              {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">No recent transactions found.</p>
        )}
      </CardContent>
      {transactions.length > 5 && (
        <div className="p-4 border-t">
            <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/finances/transactions">View All Transactions</Link>
            </Button>
        </div>
      )}
    </Card>
  );
}
