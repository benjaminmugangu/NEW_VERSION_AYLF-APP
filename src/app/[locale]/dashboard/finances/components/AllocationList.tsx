"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import type { FundAllocation } from '@/lib/types';

interface AllocationListProps {
  allocations: FundAllocation[];
  title: string;
  emptyStateMessage: string;
  linkGenerator?: (type: 'site' | 'smallGroup', id: string) => string;
}

export const AllocationList: React.FC<AllocationListProps> = ({ allocations, title, emptyStateMessage, linkGenerator }) => {
  const [isClient, setIsClient] = React.useState(false);
  const t = useTranslations('Finances');
  const tCommon = useTranslations('Common');
  const tActivityLevel = useTranslations('ActivityLevel');

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  if (!allocations || allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">{emptyStateMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const renderEntity = (type: 'national' | 'site' | 'smallGroup', id: string, name: string) => {
    // Only generate links for sites and small groups
    if (linkGenerator && (type === 'site' || type === 'smallGroup')) {
      return <Link href={linkGenerator(type, id)} className="text-primary hover:underline">{name}</Link>;
    }
    return <span>{name}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tCommon('date')}</TableHead>
              <TableHead>{t('sender_source')}</TableHead>
              <TableHead>{t('recipient')}</TableHead>
              <TableHead className="text-right">{tCommon('amount') ?? 'Amount'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => {
              const senderName = allocation.allocatedByName || tCommon('unknown');
              const sourceName = allocation.fromSiteName || tActivityLevel('national');

              let recipientName: string;
              let recipientType: 'site' | 'smallGroup' | 'national' = 'national';
              let recipientId: string | undefined;

              if (allocation.siteId && !allocation.smallGroupId) {
                recipientName = allocation.siteName || tCommon('unknown');
                recipientType = 'site';
                recipientId = allocation.siteId;
              } else if (allocation.smallGroupId) {
                recipientName = allocation.smallGroupName || tCommon('unknown');
                recipientType = 'smallGroup';
                recipientId = allocation.smallGroupId;
              } else {
                recipientName = tActivityLevel('national');
              }

              return (
                <TableRow key={allocation.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/dashboard/finances/allocations/${allocation.id}`} className="block w-full">
                      {isClient ? new Date(allocation.allocationDate).toLocaleDateString() : allocation.allocationDate}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/finances/allocations/${allocation.id}`} className="block w-full">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {allocation.fromSiteId ? renderEntity('site', allocation.fromSiteId, sourceName) : sourceName}
                        </span>
                        <span className="text-xs text-muted-foreground">{senderName}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/finances/allocations/${allocation.id}`} className="block w-full">
                      {recipientId ? renderEntity(recipientType, recipientId, recipientName) : recipientName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/finances/allocations/${allocation.id}`} className="block w-full">
                      <Badge variant={allocation.amount > 0 ? 'success' : 'destructive'}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(allocation.amount)}
                      </Badge>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


