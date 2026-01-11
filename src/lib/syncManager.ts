/**
 * Background Sync Manager
 * Handles syncing of pending transactions with the server
 */

import { indexedDBManager, PendingTransaction } from './indexedDB'

export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface SyncState {
  status: SyncStatus
  pendingCount: number
  syncingCount: number
  failedCount: number
  lastSyncAt: number | null
  currentlySyncing: string[] // IDs of transactions being synced
  error: string | null
}

type SyncListener = (state: SyncState) => void

class SyncManager {
  private listeners: Set<SyncListener> = new Set()
  private syncInterval: NodeJS.Timeout | null = null
  private isSyncing = false
  private state: SyncState = {
    status: 'idle',
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    currentlySyncing: [],
    error: null,
  }

  constructor() {
    // Initialize on load
    if (typeof window !== 'undefined') {
      this.init()
    }
  }

  private async init() {
    await this.updateState()
    this.startAutoSync()
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Network online, starting sync...')
      this.syncNow()
    })
    
    window.addEventListener('offline', () => {
      console.log('Network offline, pausing sync')
    })
  }

  private async updateState() {
    try {
      const pending = await indexedDBManager.getAllTransactions('pending')
      const syncing = await indexedDBManager.getAllTransactions('syncing')
      const failed = await indexedDBManager.getAllTransactions('failed')

      this.state = {
        ...this.state,
        pendingCount: pending.length,
        syncingCount: syncing.length,
        failedCount: failed.length,
      }

      this.notifyListeners()
    } catch (error) {
      console.error('Failed to update sync state:', error)
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    listener(this.state) // Immediately call with current state
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  startAutoSync(intervalMs: number = 5000) {
    this.stopAutoSync()
    this.syncInterval = setInterval(() => {
      if (!this.isSyncing && navigator.onLine) {
        this.syncNow()
      }
    }, intervalMs)
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async syncNow(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return
    }

    this.isSyncing = true
    this.state.status = 'syncing'
    this.state.error = null
    this.notifyListeners()

    try {
      const pending = await indexedDBManager.getAllTransactions('pending')
      
      if (pending.length === 0) {
        this.state.status = 'idle'
        this.isSyncing = false
        this.notifyListeners()
        return
      }

      // Sort by timestamp (oldest first)
      pending.sort((a, b) => a.timestamp - b.timestamp)

      // Sync transactions one by one
      for (const transaction of pending) {
        try {
          this.state.currentlySyncing.push(transaction.id)
          this.notifyListeners()

          await indexedDBManager.updateTransaction(transaction.id, {
            status: 'syncing',
          })

          const result = await this.syncTransaction(transaction)

          if (result.success) {
            await indexedDBManager.updateTransaction(transaction.id, {
              status: 'synced',
              syncedAt: Date.now(),
              serverId: result.serverId,
            })
          } else {
            // Check if it's a conflict
            if (result.conflict) {
              await indexedDBManager.updateTransaction(transaction.id, {
                status: 'failed',
                error: 'Conflict detected',
                retryCount: transaction.retryCount + 1,
              })
              // Notify about conflict
              this.notifyConflict(transaction, result.conflictData)
            } else {
              await indexedDBManager.updateTransaction(transaction.id, {
                status: transaction.retryCount >= 3 ? 'failed' : 'pending',
                error: result.error,
                retryCount: transaction.retryCount + 1,
              })
            }
          }

          this.state.currentlySyncing = this.state.currentlySyncing.filter(
            id => id !== transaction.id
          )
        } catch (error: any) {
          console.error('Failed to sync transaction:', error)
          await indexedDBManager.updateTransaction(transaction.id, {
            status: 'pending',
            error: error.message,
            retryCount: transaction.retryCount + 1,
          })

          this.state.currentlySyncing = this.state.currentlySyncing.filter(
            id => id !== transaction.id
          )
        }
      }

      this.state.status = 'idle'
      this.state.lastSyncAt = Date.now()
      await this.updateState()
    } catch (error: any) {
      console.error('Sync error:', error)
      this.state.status = 'error'
      this.state.error = error.message
      this.notifyListeners()
    } finally {
      this.isSyncing = false
      this.notifyListeners()
    }
  }

  private async syncTransaction(transaction: PendingTransaction): Promise<{
    success: boolean
    serverId?: string
    error?: string
    conflict?: boolean
    conflictData?: any
  }> {
    try {
      const response = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transaction.data,
          localId: transaction.id,
          timestamp: transaction.timestamp,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check for conflict (409)
        if (response.status === 409) {
          return {
            success: false,
            conflict: true,
            conflictData: data.conflictData,
            error: 'Transaction conflict detected',
          }
        }

        return {
          success: false,
          error: data.error || 'Failed to sync transaction',
        }
      }

      return {
        success: true,
        serverId: data.transaction?.id || data.receiptNumber,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
      }
    }
  }

  private notifyConflict(transaction: PendingTransaction, conflictData: any) {
    // Dispatch custom event for conflict notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('transaction-conflict', {
          detail: {
            transaction,
            conflictData,
          },
        })
      )
    }
  }

  getState(): SyncState {
    return this.state
  }

  async addTransaction(data: PendingTransaction['data']): Promise<string> {
    const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const transaction: PendingTransaction = {
      id,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
      data,
    }

    await indexedDBManager.addTransaction(transaction)
    await this.updateState()
    
    // Trigger immediate sync if online
    if (navigator.onLine && !this.isSyncing) {
      setTimeout(() => this.syncNow(), 100)
    }

    return id
  }

  async retryFailed(): Promise<void> {
    const failed = await indexedDBManager.getAllTransactions('failed')
    
    for (const transaction of failed) {
      await indexedDBManager.updateTransaction(transaction.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined,
      })
    }

    await this.updateState()
    this.syncNow()
  }
  
  async clearFailed(): Promise<void> {
    const failed = await indexedDBManager.getAllTransactions('failed')
    
    for (const transaction of failed) {
      await indexedDBManager.deleteTransaction(transaction.id)
    }

    await this.updateState()
    console.log(`Cleared ${failed.length} failed transaction(s)`)
  }

  async clearSynced(): Promise<void> {
    await indexedDBManager.clearSyncedTransactions()
    await this.updateState()
  }

  isSyncInProgress(): boolean {
    return this.isSyncing || this.state.currentlySyncing.length > 0
  }
}

// Export singleton instance
export const syncManager = new SyncManager()
