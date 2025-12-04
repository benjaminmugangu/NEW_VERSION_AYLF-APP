'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Lock, LockOpen, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { closeAccountingPeriod, reopenAccountingPeriod } from '@/services/accountingService';
import type { AccountingPeriod } from '@prisma/client';

interface AccountingPeriodListProps {
    periods: (AccountingPeriod & { closedBy?: { name: string; email: string } | null })[];
    currentUserId: string;
}

export function AccountingPeriodList({ periods, currentUserId }: AccountingPeriodListProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    const handleClose = async (periodId: string) => {
        if (!confirm('Are you sure you want to close this accounting period? This action will prevent further modifications to transactions in this period.')) {
            return;
        }

        setLoading(periodId);
        try {
            await closeAccountingPeriod(periodId, currentUserId);
            toast({
                title: 'Success',
                description: 'Accounting period closed successfully.',
            });
            router.refresh();
        } catch (error) {
            toast({
                title: 'Error',
                description: (error as Error).message || 'Failed to close period',
                variant: 'destructive',
            });
        } finally {
            setLoading(null);
        }
    };

    const handleReopen = async (periodId: string) => {
        if (!confirm('Are you sure you want to reopen this accounting period?')) {
            return;
        }

        setLoading(periodId);
        try {
            await reopenAccountingPeriod(periodId);
            toast({
                title: 'Success',
                description: 'Accounting period reopened successfully.',
            });
            router.refresh();
        } catch (error) {
            toast({
                title: 'Error',
                description: (error as Error).message || 'Failed to reopen period',
                variant: 'destructive',
            });
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Closed By</TableHead>
                        <TableHead>Snapshot</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {periods.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                No accounting periods found. Create one to get started.
                            </TableCell>
                        </TableRow>
                    ) : (
                        periods.map((period) => (
                            <TableRow key={period.id}>
                                <TableCell className="font-medium capitalize">{period.type}</TableCell>
                                <TableCell>{format(new Date(period.startDate), 'PP')}</TableCell>
                                <TableCell>{format(new Date(period.endDate), 'PP')}</TableCell>
                                <TableCell>
                                    {period.status === 'open' ? (
                                        <Badge variant="default" className="gap-1">
                                            <LockOpen className="h-3 w-3" />
                                            Open
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="gap-1">
                                            <Lock className="h-3 w-3" />
                                            Closed
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {period.closedBy ? (
                                        <div className="text-sm">
                                            <div>{period.closedBy.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {period.closedAt && format(new Date(period.closedAt), 'PPp')}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {period.snapshotData ? (
                                        <div className="text-sm">
                                            <div className="font-medium">
                                                Net: ${(period.snapshotData as any).netBalance?.toFixed(2) || '0.00'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {(period.snapshotData as any).transactionCount || 0} transactions
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" disabled={loading === period.id}>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {period.status === 'open' ? (
                                                <DropdownMenuItem onClick={() => handleClose(period.id)}>
                                                    <Lock className="mr-2 h-4 w-4" />
                                                    Close Period
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem onClick={() => handleReopen(period.id)}>
                                                    <LockOpen className="mr-2 h-4 w-4" />
                                                    Reopen Period
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
