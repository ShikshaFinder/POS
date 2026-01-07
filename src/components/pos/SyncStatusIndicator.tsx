'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2, AlertCircle, CheckCircle2, WifiOff } from 'lucide-react'
import { syncManager, SyncState } from '@/lib/syncManager'
import { cn } from '@/lib/utils'

export default function SyncStatusIndicator() {
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState())
  const [isOnline, setIsOnline] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Subscribe to sync state changes
    const unsubscribe = syncManager.subscribe(setSyncState)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        text: 'Offline',
        color: 'text-gray-600 bg-gray-100',
        detail: 'Working offline - transactions will sync when online'
      }
    }

    if (syncState.status === 'syncing') {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: `Syncing ${syncState.syncingCount}...`,
        color: 'text-blue-600 bg-blue-100',
        detail: 'Syncing transactions to server'
      }
    }

    if (syncState.pendingCount > 0) {
      return {
        icon: <Cloud className="h-4 w-4" />,
        text: `${syncState.pendingCount} pending`,
        color: 'text-amber-600 bg-amber-100',
        detail: `${syncState.pendingCount} transaction(s) waiting to sync`
      }
    }

    if (syncState.failedCount > 0) {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: `${syncState.failedCount} failed`,
        color: 'text-red-600 bg-red-100',
        detail: 'Some transactions failed to sync'
      }
    }

    return {
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: 'All synced',
      color: 'text-green-600 bg-green-100',
      detail: 'All transactions synced successfully'
    }
  }

  const status = getStatusInfo()

  const handleRetry = async () => {
    if (syncState.failedCount > 0) {
      await syncManager.retryFailed()
    } else if (syncState.pendingCount > 0) {
      await syncManager.syncNow()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105',
          status.color
        )}
      >
        {status.icon}
        <span>{status.text}</span>
      </button>

      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Sync Status</h3>
              <p className="text-sm text-gray-600">{status.detail}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-600">Pending</div>
                <div className="text-lg font-semibold text-gray-900">{syncState.pendingCount}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-600">Failed</div>
                <div className="text-lg font-semibold text-red-600">{syncState.failedCount}</div>
              </div>
            </div>

            {syncState.lastSyncAt && (
              <div className="text-xs text-gray-500">
                Last sync: {new Date(syncState.lastSyncAt).toLocaleTimeString()}
              </div>
            )}

            {(syncState.pendingCount > 0 || syncState.failedCount > 0) && (
              <button
                onClick={handleRetry}
                disabled={syncState.status === 'syncing'}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </button>
            )}

            {syncState.error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                Error: {syncState.error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close details */}
      {showDetails && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  )
}
