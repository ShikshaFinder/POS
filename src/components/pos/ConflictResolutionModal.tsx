'use client'

import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ConflictData {
  transactionId: string
  localData: any
  serverData: any
}

export function ConflictResolutionModal() {
  const [conflict, setConflict] = useState<ConflictData | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    const handleConflict = (event: CustomEvent) => {
      setConflict(event.detail)
    }

    window.addEventListener('transaction-conflict', handleConflict as EventListener)

    return () => {
      window.removeEventListener('transaction-conflict', handleConflict as EventListener)
    }
  }, [])

  const resolveConflict = async (choice: 'local' | 'server') => {
    if (!conflict) return

    setResolving(true)
    try {
      const response = await fetch('/api/pos/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: conflict.transactionId,
          resolution: choice,
          localData: conflict.localData,
          serverData: conflict.serverData
        })
      })

      if (response.ok) {
        // Update IndexedDB with resolved transaction
        const { indexedDBManager } = await import('@/lib/indexedDB')

        if (choice === 'local') {
          // Re-sync local version
          await indexedDBManager.updateTransaction(conflict.transactionId, {
            status: 'pending',
            retryCount: 0,
            error: undefined
          })
        } else {
          // Mark as synced with server version
          await indexedDBManager.updateTransaction(conflict.transactionId, {
            status: 'synced'
          })
        }

        // Close modal
        setConflict(null)
      } else {
        alert('Failed to resolve conflict')
      }
    } catch (error) {
      console.error('Conflict resolution error:', error)
      alert('Failed to resolve conflict')
    } finally {
      setResolving(false)
    }
  }

  if (!conflict) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transaction Conflict Detected
            </h2>
          </div>
          <button
            onClick={() => setConflict(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={resolving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This transaction was modified on the server. Please choose which version to keep:
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Local Version */}
            <div className="border border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Your Version (Local)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {conflict.localData.customerName || 'Walk-in'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Items:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {conflict.localData.items?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{conflict.localData.totalAmount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payment:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {conflict.localData.paymentMethod || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Modified:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(conflict.localData.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Server Version */}
            <div className="border border-green-300 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                Server Version
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {conflict.serverData.customerName || 'Walk-in'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Items:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {conflict.serverData.items?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{conflict.serverData.totalAmount?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payment:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {conflict.serverData.paymentMethod || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Modified:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(conflict.serverData.updatedAt || conflict.serverData.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => resolveConflict('local')}
              disabled={resolving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {resolving ? 'Resolving...' : 'Keep My Version'}
            </button>
            <button
              onClick={() => resolveConflict('server')}
              disabled={resolving}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
            >
              {resolving ? 'Resolving...' : 'Keep Server Version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
