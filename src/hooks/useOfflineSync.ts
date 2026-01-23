'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/offline-db'

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(true)
    const [pendingOps, setPendingOps] = useState(0)

    const checkPending = useCallback(async () => {
        const pending = await db.syncQueue.where('synced').equals(0).count()
        setPendingOps(pending)
    }, []);

    const syncPending = useCallback(async () => {
        const pending = await db.syncQueue.where('synced').equals(0).toArray()
        setPendingOps(pending.length)

        for (const op of pending) {
            try {
                await fetch(op.endpoint, {
                    method: op.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(op.data)
                })
                await db.syncQueue.update(op.id!, { synced: 1 })
            } catch (e) {
                console.error('Sync failed:', e)
                // Will retry on next online event
            }
        }

        await checkPending()
    }, [checkPending]);

    useEffect(() => {
        // Set initial online status
        setIsOnline(navigator.onLine)

        const handleOnline = async () => {
            setIsOnline(true)
            await syncPending()
        }

        const handleOffline = () => {
            setIsOnline(false)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        // Initial sync check
        checkPending()

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [syncPending, checkPending])

    const queueOperation = async (endpoint: string, method: string, data: any) => {
        await db.syncQueue.add({
            operation: `${method} ${endpoint}`,
            endpoint,
            method,
            data,
            timestamp: new Date(),
            synced: 0
        })
        await checkPending()
    }

    return { isOnline, pendingOps, queueOperation }
}
