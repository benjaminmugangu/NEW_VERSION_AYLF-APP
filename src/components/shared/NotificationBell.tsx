'use client'

import { useEffect, useState } from 'react'
import { Bell, Check, Trash2, Mail } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    link: string | null
    read: boolean
    createdAt: string
}

interface NotificationsResponse {
    notifications: Notification[]
    unreadCount: number
}

export function NotificationBell() {
    const [open, setOpen] = useState(false)
    const queryClient = useQueryClient()

    // Fetch notifications
    const { data, isLoading } = useQuery<NotificationsResponse>({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await fetch('/api/notifications')
            if (!res.ok) throw new Error('Failed to fetch notifications')
            return res.json()
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    })

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId }),
            })
            if (!res.ok) throw new Error('Failed to mark as read')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllRead: true }),
            })
            if (!res.ok) throw new Error('Failed to mark all as read')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })

    // Delete mutation
    const deleteNotificationMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            const res = await fetch(`/api/notifications?id=${notificationId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to delete notification')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsReadMutation.mutate(notification.id)
        }
        if (notification.link) {
            setOpen(false)
        }
    }

    const unreadCount = data?.unreadCount || 0
    const notifications = data?.notifications || []

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                    </h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllAsReadMutation.mutate()}
                            className="text-xs"
                        >
                            <Mail className="h-3 w-3 mr-1" />
                            Tout marquer lu
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Chargement...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                            <p>Aucune notification</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        'p-4 hover:bg-accent transition-colors group relative',
                                        !notification.read && 'bg-primary/5'
                                    )}
                                >
                                    {notification.link ? (
                                        <Link
                                            href={notification.link}
                                            onClick={() => handleNotificationClick(notification)}
                                            className="block"
                                        >
                                            <NotificationContent notification={notification} />
                                        </Link>
                                    ) : (
                                        <div onClick={() => handleNotificationClick(notification)}>
                                            <NotificationContent notification={notification} />
                                        </div>
                                    )}

                                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!notification.read && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    markAsReadMutation.mutate(notification.id)
                                                }}
                                                className="h-7 text-xs"
                                            >
                                                <Check className="h-3 w-3 mr-1" />
                                                Marquer lu
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                deleteNotificationMutation.mutate(notification.id)
                                            }}
                                            className="h-7 text-xs text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Supprimer
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}

function NotificationContent({ notification }: { notification: Notification }) {
    return (
        <>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <p className={cn('text-sm font-medium', !notification.read && 'font-semibold')}>
                        {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                </div>
                {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                    locale: fr,
                })}
            </p>
        </>
    )
}
