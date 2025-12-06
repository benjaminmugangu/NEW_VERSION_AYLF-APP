'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineIndicator() {
    const { isOnline, pendingOps } = useOfflineSync()

    if (isOnline && pendingOps === 0) return null

    return (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 bg-orange-500 text-white flex items-center gap-2">
            {isOnline ? (
                <>
                    <Wifi className="h-4 w-4" />
                    <span>Synchronisation {pendingOps} opération(s)...</span>
                </>
            ) : (
                <>
                    <WifiOff className="h-4 w-4" />
                    <span>Mode Hors Ligne - {pendingOps} en attente</span>
                </>
            )}
        </div>
    )
}
