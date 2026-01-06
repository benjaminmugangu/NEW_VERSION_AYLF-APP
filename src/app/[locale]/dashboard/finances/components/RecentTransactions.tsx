// src/app/dashboard/finances/components/RecentTransactions.tsx
"use client";

import { useTranslations, useFormatter } from 'next-intl';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowDownLeft, ArrowUpRight, History, Send } from "lucide-react";
import Link from 'next/link';

interface RecentTransactionsProps {
  transactions: any[]; // Accept unified activity
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const t = useTranslations('Finances');
  const format = useFormatter();

  return (
    <Card className="h-full border-2 border-border/50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {t('recent_transactions')}
          </CardTitle>
          <CardDescription>
            {t('recent_transactions_desc')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {transactions.slice(0, 5).map((item) => {
          const isAllocation = item.activityType === 'allocation';
          const isIncome = item.type === 'income';

          return (
            <div key={item.id} className="flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <UserAvatar
                  user={{
                    name: (item.userName || item.description) || undefined,
                    avatarUrl: item.userAvatarUrl || undefined
                  }}
                  size="md"
                  className="border-2 border-border/20 transition-colors group-hover:border-primary/20"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-none truncate max-w-[150px]">{item.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format.dateTime(new Date(item.date), { month: 'short', day: 'numeric' })}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <Badge variant="outline" className="text-[10px] py-0 px-1 border-muted-foreground/20">
                      {isAllocation ? t('allocation') ?? 'Allocation' : item.category}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className={`text-right text-sm font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                {isIncome ? '+' : '-'}
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount)}
              </div>
            </div>
          );
        })}
        {transactions.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <History className="h-8 w-8 opacity-20" />
            <p className="text-sm italic">{t('no_transactions')}</p>
          </div>
        )}
      </CardContent>
      {transactions.length > 5 && (
        <div className="p-4 pt-0">
          <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground hover:text-primary">
            <Link href="/dashboard/finances/transactions">{t('view_all_transactions')}</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}
