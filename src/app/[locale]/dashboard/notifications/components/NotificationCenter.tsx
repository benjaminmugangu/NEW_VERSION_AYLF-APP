'use client';

import React, { useState } from 'react';
import { useLocale } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Trash2, MailOpen, AlertCircle, Calendar, Info, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    createdAt: string;
}

export function NotificationCenter() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    // Fetch notifications
    const { data, isLoading } = useQuery<{ notifications: Notification[] }>({
        queryKey: ['notifications', 'full', filter],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?limit=100${filter === 'unread' ? '&unread=true' : ''}`);
            if (!res.ok) throw new Error('Impossible de charger les notifications');
            return res.json();
        },
    });

    // Mark as read
    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch('/api/notifications', {
                method: 'PATCH',
                body: JSON.stringify({ notificationId: id })
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
    });

    // Mark ALL read
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            await fetch('/api/notifications', {
                method: 'PATCH',
                body: JSON.stringify({ markAllRead: true })
            });
        },
        onSuccess: () => {
            toast({ title: 'Succès', description: 'Toutes les notifications sont marquées comme lues.' });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    // Delete
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            toast({ title: 'Supprimée', description: 'Notification supprimée.' });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const getIcon = (type: string) => {
        if (type.includes('ALERT') || type.includes('REJECTED')) return <AlertCircle className="h-5 w-5 text-red-500" />;
        if (type.includes('REMINDER')) return <Calendar className="h-5 w-5 text-orange-500" />;
        if (type.includes('APPROVED') || type.includes('RECEIVED')) return <Check className="h-5 w-5 text-green-500" />;
        return <Info className="h-5 w-5 text-blue-500" />;
    };

    const locale = useLocale();

    // Map string locale to date-fns locale object
    const getDateLocale = (localeStr: string) => {
        if (localeStr === 'fr') return fr;
        // case 'sw': return sw; // date-fns might not have sw, typically en is fallback or sw if available
        return undefined; // defaults to en-US
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="w-[400px]">
                    <TabsList>
                        <TabsTrigger value="all">Toutes</TabsTrigger>
                        <TabsTrigger value="unread">Non Lues</TabsTrigger>
                    </TabsList>
                </Tabs>

                <Button
                    variant="outline"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={isLoading || data?.notifications.length === 0}
                >
                    <MailOpen className="mr-2 h-4 w-4" /> Tout marquer comme lu
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" /> Centre de Notifications
                    </CardTitle>
                    <CardDescription>
                        Consultez votre historique et gérez vos alertes importantes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {!isLoading && data?.notifications.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Bell className="mx-auto h-12 w-12 opacity-20 mb-4" />
                            <p>Aucune notification pour le moment.</p>
                        </div>
                    )}

                    {!isLoading && (data?.notifications.length ?? 0) > 0 && (
                        <div className="space-y-4">
                            {data?.notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={cn(
                                        "flex gap-4 p-4 rounded-lg border transition-all hover:bg-slate-50",
                                        notif.read ? "bg-white" : "bg-blue-50/50 border-blue-100"
                                    )}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={cn("text-sm font-semibold", !notif.read && "text-blue-700")}>
                                                {notif.title}
                                            </h4>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                {format(new Date(notif.createdAt), "d MMM yyyy 'at' HH:mm", { locale: getDateLocale(locale) })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-3">{notif.message}</p>

                                        <div className="flex gap-2">
                                            {notif.link && (
                                                <Button variant="link" size="sm" className="h-auto p-0 text-blue-600" asChild>
                                                    <Link href={notif.link}>Voir détails</Link>
                                                </Button>
                                            )}
                                            {!notif.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto p-0 text-slate-500 hover:text-blue-600"
                                                    onClick={() => markReadMutation.mutate(notif.id)}
                                                >
                                                    Marquer comme lu
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-600"
                                            onClick={() => deleteMutation.mutate(notif.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
