'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, RefreshCw, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface AuditLog {
    id: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    actor: {
        id: string;
        name: string;
        email: string;
    };
}

const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    approve: 'bg-emerald-100 text-emerald-800',
    reject: 'bg-orange-100 text-orange-800',
    reverse: 'bg-purple-100 text-purple-800',
};

const entityTypeLabels: Record<string, string> = {
    FundAllocation: 'Allocation',
    FinancialTransaction: 'Transaction',
    Report: 'Rapport',
    Activity: 'Activité',
};

export default function AuditLogsPage() {
    const t = useTranslations('AuditLogs');
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [entityType, setEntityType] = useState<string>('');
    const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
    const [toDate, setToDate] = useState<Date | undefined>(undefined);

    const fetchLogs = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (entityType && entityType !== 'all') params.append('entityType', entityType);
            if (fromDate) params.append('from', fromDate.toISOString());
            if (toDate) params.append('to', toDate.toISOString());

            const response = await fetch(`/api/audit-logs?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch audit logs');
            }
            const data = await response.json();
            setLogs(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [entityType, fromDate, toDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleApplyFilters = () => {
        fetchLogs();
    };

    const handleResetFilters = () => {
        setEntityType('');
        setFromDate(undefined);
        setToDate(undefined);
        setTimeout(fetchLogs, 0);
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title={t('title')}
                description={t('description')}
            />

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        {t('filters.all_actions')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm font-medium mb-2 block">{t('table.entity')}</label>
                            <Select value={entityType} onValueChange={setEntityType}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('filters.all_actions')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('filters.all_actions')}</SelectItem>
                                    <SelectItem value="FundAllocation">Allocations</SelectItem>
                                    <SelectItem value="FinancialTransaction">Transactions</SelectItem>
                                    <SelectItem value="Report">Rapports</SelectItem>
                                    <SelectItem value="Activity">Activités</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-[180px]">
                            <label className="text-sm font-medium mb-2 block">{t('filters.time_range')}</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !fromDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {fromDate ? format(fromDate, "dd MMM yyyy", { locale: fr }) : t('filters.time_range')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={fromDate}
                                        onSelect={setFromDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="min-w-[180px]">
                            <label className="text-sm font-medium mb-2 block">{t('filters.time_range')}</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !toDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {toDate ? format(toDate, "dd MMM yyyy", { locale: fr }) : t('filters.time_range')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={toDate}
                                        onSelect={setToDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <Button onClick={handleApplyFilters} disabled={loading}>
                            {t('filters.all_actions')}
                        </Button>
                        <Button variant="outline" onClick={handleResetFilters} disabled={loading}>
                            {t('filters.all_actions')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>
                        {t('title')} ({logs.length})
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-red-500 text-center py-4">{error}</div>
                    ) : loading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('no_logs')}</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('no_logs')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('table.timestamp')}</TableHead>
                                        <TableHead>{t('table.user')}</TableHead>
                                        <TableHead>{t('table.action')}</TableHead>
                                        <TableHead>{t('table.entity')}</TableHead>
                                        <TableHead>{t('table.details')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{log.actor.name}</div>
                                                <div className="text-xs text-muted-foreground">{log.actor.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}>
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {entityTypeLabels[log.entityType] || log.entityType}
                                            </TableCell>
                                            <TableCell className="max-w-[300px]">
                                                {log.metadata?.comment && (
                                                    <span className="text-sm">{log.metadata.comment}</span>
                                                )}
                                                {log.metadata?.reason && (
                                                    <span className="text-sm text-muted-foreground">
                                                        Raison: {log.metadata.reason}
                                                    </span>
                                                )}
                                                {!log.metadata?.comment && !log.metadata?.reason && (
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {log.entityId.slice(0, 8)}...
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
