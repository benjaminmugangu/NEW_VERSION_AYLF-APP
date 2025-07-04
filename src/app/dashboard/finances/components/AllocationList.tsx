"use client";

import React from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import type { FundAllocation } from '@/lib/types';
import { mockSites, mockSmallGroups } from '@/lib/mockData'; // For name lookups

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
              const senderName = allocation.senderType === 'national' 
                ? 'National Coordination' 
                : mockSites.find(s => s.id === allocation.senderId)?.name || 'Unknown Site';
              
              const recipientName = allocation.recipientType === 'site' 
                ? mockSites.find(s => s.id === allocation.recipientId)?.name || 'Unknown Site' 
                : mockSmallGroups.find(sg => sg.id === allocation.recipientId)?.name || 'Unknown Group';

              return (
                <TableRow key={allocation.id}>
                  <TableCell>{isClient ? new Date(allocation.allocationDate).toLocaleDateString() : allocation.allocationDate}</TableCell>
                  <TableCell className="font-medium">
                    {renderEntity(allocation.senderType, allocation.senderId, senderName)}
                  </TableCell>
                  <TableCell>
                    {renderEntity(allocation.recipientType, allocation.recipientId, recipientName)}
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


