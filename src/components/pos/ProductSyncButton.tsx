'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Database, CheckCircle2, AlertCircle, Loader2, CloudDownload } from 'lucide-react'
import { productSyncService, SyncProgress } from '@/lib/productSyncService'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ProductSyncButtonProps {
  onSyncComplete?: () => void
  className?: string
}

export default function ProductSyncButton({ onSyncComplete, className }: ProductSyncButtonProps) {
  const [progress, setProgress] = useState<SyncProgress>(productSyncService.getProgress())
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [hasCachedData, setHasCachedData] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [cacheStats, setCacheStats] = useState<{
    productsCount: number
    categoriesCount: number
    imagesCount: number
  } | null>(null)

  useEffect(() => {
    // Subscribe to sync progress updates
    const unsubscribe = productSyncService.subscribe(setProgress)

    // Load initial data
    loadCacheInfo()

    return () => {
      unsubscribe()
    }
  }, [])

  const loadCacheInfo = async () => {
    const [hasData, lastSync, stats] = await Promise.all([
      productSyncService.hasCachedData(),
      productSyncService.getLastSyncTime(),
      productSyncService.getCacheStats()
    ])
    setHasCachedData(hasData)
    setLastSyncTime(lastSync)
    setCacheStats(stats)
  }

  const handleSync = async () => {
    if (progress.phase !== 'idle' && progress.phase !== 'complete' && progress.phase !== 'error') {
      return // Already syncing
    }

    const result = await productSyncService.syncAll()

    if (result.success) {
      toast.success(`Synced ${result.productsCount} products and ${result.imagesCount} images`)
      await loadCacheInfo()
      onSyncComplete?.()
    } else {
      toast.error(result.error || 'Sync failed')
    }
  }

  const handleClearCache = async () => {
    const confirmed = confirm('Are you sure you want to clear all cached product data? You will need to sync again to use offline.')
    if (confirmed) {
      await productSyncService.clearCache()
      await loadCacheInfo()
      toast.success('Cache cleared')
      onSyncComplete?.()
    }
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never'
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const getStatusInfo = () => {
    if (progress.phase === 'fetching') {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        text: 'Fetching...',
        color: 'text-blue-600 bg-blue-100'
      }
    }

    if (progress.phase === 'caching-images') {
      const percent = progress.totalImages > 0
        ? Math.round((progress.cachedImages / progress.totalImages) * 100)
        : 0
      return {
        icon: <CloudDownload className="h-4 w-4 animate-pulse" />,
        text: `Images ${percent}%`,
        color: 'text-blue-600 bg-blue-100'
      }
    }

    if (progress.phase === 'error') {
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        text: 'Sync failed',
        color: 'text-red-600 bg-red-100'
      }
    }

    if (!hasCachedData) {
      return {
        icon: <Database className="h-4 w-4" />,
        text: 'Not synced',
        color: 'text-gray-600 bg-gray-100'
      }
    }

    return {
      icon: <CheckCircle2 className="h-4 w-4" />,
      text: formatLastSync(lastSyncTime),
      color: 'text-green-600 bg-green-100'
    }
  }

  const status = getStatusInfo()
  const isSyncing = progress.phase === 'fetching' || progress.phase === 'caching-images'

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105',
          status.color
        )}
        title="Product Sync"
      >
        {status.icon}
        <span className="hidden sm:inline">{status.text}</span>
      </button>

      {showDetails && (
        <>
          {/* Overlay to close details */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Offline Product Data
                </h3>
                <p className="text-sm text-gray-600">
                  {hasCachedData
                    ? 'Products are cached for offline use'
                    : 'Sync to enable offline mode'}
                </p>
              </div>

              {/* Progress indicator during sync */}
              {isSyncing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {progress.phase === 'fetching' ? 'Fetching products...' : 'Caching images...'}
                    </span>
                    <span>
                      {progress.phase === 'caching-images'
                        ? `${progress.cachedImages}/${progress.totalImages}`
                        : `${progress.syncedProducts}/${progress.totalProducts}`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${progress.phase === 'caching-images'
                          ? (progress.totalImages > 0 ? (progress.cachedImages / progress.totalImages) * 100 : 0)
                          : (progress.totalProducts > 0 ? (progress.syncedProducts / progress.totalProducts) * 100 : 0)}%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Cache stats */}
              {cacheStats && hasCachedData && !isSyncing && (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-gray-600 text-xs">Products</div>
                    <div className="text-lg font-semibold text-gray-900">{cacheStats.productsCount}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-gray-600 text-xs">Categories</div>
                    <div className="text-lg font-semibold text-gray-900">{cacheStats.categoriesCount}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-center">
                    <div className="text-gray-600 text-xs">Images</div>
                    <div className="text-lg font-semibold text-gray-900">{cacheStats.imagesCount}</div>
                  </div>
                </div>
              )}

              {/* Last sync time */}
              {lastSyncTime && (
                <div className="text-xs text-gray-500">
                  Last synced: {new Date(lastSyncTime).toLocaleString()}
                </div>
              )}

              {/* Error message */}
              {progress.phase === 'error' && progress.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  Error: {progress.error}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || !navigator.onLine}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                  {isSyncing ? 'Syncing...' : hasCachedData ? 'Re-sync Products' : 'Sync Products'}
                </button>

                {hasCachedData && (
                  <button
                    onClick={handleClearCache}
                    disabled={isSyncing}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Cache
                  </button>
                )}
              </div>

              {!navigator.onLine && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  You are offline. Connect to internet to sync.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
