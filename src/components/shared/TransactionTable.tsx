// src/components/shared/TransactionTable.tsx
"use client";

import type { Transaction, Site, SmallGroup } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Eye } from "lucide-react";
import Link from "next/link";
import { mockSites, mockSmallGroups } from "@/lib/mockData"; // For resolving names

interface TransactionTableProps {
  transactions: Transaction[];
  title?: string;
  description?: string;
  showEntityType?: 'sender' | 'recipient' | 'both'; // To specify which entity type to show if needed
  onViewDetails?: (transactionId: string) => void; // For future detail view modal
  siteContextId?: string; // If the table is in the context of a specific site
}

const formatCurrency = (amount: number) => {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getEntityName = (type: Transaction['senderEntityType'] | Transaction['recipientEntityType'], id: string): string => {
  if (type === 'national') return "AYLF National";
  if (type === 'site') return mockSites.find(s => s.id === id)?.name || id;
  if (type === 'small_group') {
    const sg = mockSmallGroups.find(s => s.id === id);
    if (sg) {
        const site = mockSites.find(s => s.id === sg.siteId);
        return `${sg.name} (${site?.name || 'Unknown Site'})`;
    }
    return id;
  }
  if (type === 'external_donor' || type === 'vendor' || type === 'beneficiary' || type === 'other') return id; // Could be improved with a lookup
  return id;
};


export function TransactionTable({ transactions, title, description, onViewDetails, siteContextId }: TransactionTableProps) {

  if (!transactions || transactions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No transactions found.</p>;
  }
  
  return (
    <div className="overflow-x-auto rounded-md border">
      {title && <h3 className="text-lg font-semibold p-4 border-b">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground p-4 pt-0 border-b">{description}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>From</TableHead>
            <TableHead className="w-8 text-center"></TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Type</TableHead>
            {onViewDetails && <TableHead className="text-right w-[80px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium max-w-xs truncate" title={transaction.description}>{transaction.description}</TableCell>
              <TableCell className={`${transaction.transactionType === 'income_source' ? 'text-green-600' : transaction.transactionType === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                {transaction.transactionType === 'income_source' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell>
                {transaction.senderEntityName || getEntityName(transaction.senderEntityType, transaction.senderEntityId)}
                {transaction.senderEntityType === 'site' && transaction.senderEntityId !== siteContextId && (
                    <Link
                      href={`/dashboard/finances/transactions/site/${transaction.senderEntityId}`}
                      legacyBehavior>
                        <Button variant="link" size="sm" className="p-0 ml-1 h-auto text-xs">(View Site)</Button>
                    </Link>
                )}
              </TableCell>
              <TableCell className="text-center px-0">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground"/>
              </TableCell>
              <TableCell>
                 {transaction.recipientEntityName || getEntityName(transaction.recipientEntityType, transaction.recipientEntityId)}
                 {transaction.recipientEntityType === 'site' && transaction.recipientEntityId !== siteContextId && (
                    <Link
                      href={`/dashboard/finances/transactions/site/${transaction.recipientEntityId}`}
                      legacyBehavior>
                         <Button variant="link" size="sm" className="p-0 ml-1 h-auto text-xs">(View Site)</Button>
                    </Link>
                 )}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={
                    transaction.transactionType === 'income_source' ? 'default' : 
                    transaction.transactionType === 'expense' ? 'destructive' : 
                    'secondary'
                } className="capitalize">
                  {transaction.transactionType.replace('_', ' ')}
                </Badge>
              </TableCell>
              {onViewDetails && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onViewDetails(transaction.id)} title="View Details">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
