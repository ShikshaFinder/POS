/**
 * IndexedDB wrapper for POS offline storage
 * Stores pending transactions for offline-first sync
 */

const DB_NAME = 'pos-offline-db'
const DB_VERSION = 1
const TRANSACTIONS_STORE = 'pending-transactions'

export interface PendingTransaction {
  id: string // Unique local ID
  timestamp: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retryCount: number
  data: {
    items: any[]
    totals: any
    payment: any
    customer?: any
  }
  error?: string
  syncedAt?: number
  serverId?: string // ID from server after sync
}

class IndexedDBManager {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create transactions store
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const transactionsStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' })
          transactionsStore.createIndex('timestamp', 'timestamp', { unique: false })
          transactionsStore.createIndex('status', 'status', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  async addTransaction(transaction: PendingTransaction): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TRANSACTIONS_STORE], 'readwrite')
      const store = tx.objectStore(TRANSACTIONS_STORE)
      const request = store.add(transaction)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async updateTransaction(id: string, updates: Partial<PendingTransaction>): Promise<void> {
    const db = await this.init()
    return new Promise(async (resolve, reject) => {
      const tx = db.transaction([TRANSACTIONS_STORE], 'readwrite')
      const store = tx.objectStore(TRANSACTIONS_STORE)
      
      const getRequest = store.get(id)
      
      getRequest.onsuccess = () => {
        const transaction = getRequest.result
        if (!transaction) {
          reject(new Error('Transaction not found'))
          return
        }

        const updated = { ...transaction, ...updates }
        const putRequest = store.put(updated)
        
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }
      
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async getTransaction(id: string): Promise<PendingTransaction | null> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TRANSACTIONS_STORE], 'readonly')
      const store = tx.objectStore(TRANSACTIONS_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllTransactions(status?: PendingTransaction['status']): Promise<PendingTransaction[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TRANSACTIONS_STORE], 'readonly')
      const store = tx.objectStore(TRANSACTIONS_STORE)
      
      let request: IDBRequest
      if (status) {
        const index = store.index('status')
        request = index.getAll(status)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getPendingTransactionsCount(): Promise<number> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TRANSACTIONS_STORE], 'readonly')
      const store = tx.objectStore(TRANSACTIONS_STORE)
      const index = store.index('status')
      const request = index.count('pending')

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteTransaction(id: string): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TRANSACTIONS_STORE], 'readwrite')
      const store = tx.objectStore(TRANSACTIONS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearSyncedTransactions(): Promise<void> {
    const db = await this.init()
    const synced = await this.getAllTransactions('synced')
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TRANSACTIONS_STORE], 'readwrite')
      const store = tx.objectStore(TRANSACTIONS_STORE)
      
      let completed = 0
      synced.forEach(transaction => {
        const request = store.delete(transaction.id)
        request.onsuccess = () => {
          completed++
          if (completed === synced.length) resolve()
        }
        request.onerror = () => reject(request.error)
      })

      if (synced.length === 0) resolve()
    })
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager()
