"use client";

import React from 'react';
import Link from 'next/link';
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
              <TableHead>Date</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => {
              // New logic using correct properties from FundAllocation type
              const senderName = allocation.allocatedByName || 'Unknown User';

              let recipientName: string;
              let recipientType: 'site' | 'smallGroup' | 'national' = 'national';
              let recipientId: string | undefined;

              if (allocation.siteId && !allocation.smallGroupId) {
                recipientName = allocation.siteName || 'Unknown Site';
                recipientType = 'site';
                recipientId = allocation.siteId;
              } else if (allocation.smallGroupId) {
                recipientName = allocation.smallGroupName || 'Unknown Group';
                recipientType = 'smallGroup';
                recipientId = allocation.smallGroupId;
              } else {
                recipientName = 'National Coordination'; // Or other appropriate fallback
              }

              return (
                <TableRow key={allocation.id}>
                  <TableCell>{isClient ? new Date(allocation.allocationDate).toLocaleDateString() : allocation.allocationDate}</TableCell>
                  <TableCell className="font-medium">
                    {/* Sender is always a user, not a linkable entity here */}
                    {senderName}
                  </TableCell>
                  <TableCell>
                    {/* Recipient can be a site or small group */}
                    {recipientId ? renderEntity(recipientType, recipientId, recipientName) : recipientName}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={allocation.amount > 0 ? 'success' : 'destructive'}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(allocation.amount)}
                    </Badge>
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


