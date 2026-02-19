/**
 * IndexedDB wrapper for POS offline storage
 * Stores pending transactions, products, categories, and images for offline-first sync
 */

const DB_NAME = 'pos-offline-db'
const DB_VERSION = 2 // Bumped for new stores
const TRANSACTIONS_STORE = 'pending-transactions'
const PRODUCTS_STORE = 'products'
const CATEGORIES_STORE = 'categories'
const PRODUCT_IMAGES_STORE = 'product-images'
const SYNC_METADATA_STORE = 'sync-metadata'

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

export interface CachedProduct {
  id: string
  name: string
  sku: string | null
  unitPrice: number | null
  markedPrice: number | null
  currentStock: number | null
  reorderLevel: number | null
  unit: string
  category: string
  categoryId: string | null
  gstRate: number
  imageUrl: string | null // Original remote URL
  hasLocalImage: boolean // Whether image is cached locally
  updatedAt: number // Timestamp when cached
  // Additional product detail fields for offline use
  description: string | null
  barcode: string | null // Alias/barcode for quick search
  packSize: string | null // e.g., "200 ml", "1 L"
  subCategory: string | null
}

export interface CachedCategory {
  id: string
  name: string
  productCount: number
  updatedAt: number
}

export interface CachedProductImage {
  productId: string
  blob: Blob
  mimeType: string
  cachedAt: number
}

export interface SyncMetadata {
  key: string // 'products' | 'categories' | 'lastSync'
  value: any
  updatedAt: number
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
        const oldVersion = event.oldVersion

        // Create transactions store (v1)
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const transactionsStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' })
          transactionsStore.createIndex('timestamp', 'timestamp', { unique: false })
          transactionsStore.createIndex('status', 'status', { unique: false })
        }

        // Create new stores (v2)
        if (oldVersion < 2) {
          // Products store
          if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
            const productsStore = db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' })
            productsStore.createIndex('categoryId', 'categoryId', { unique: false })
            productsStore.createIndex('name', 'name', { unique: false })
            productsStore.createIndex('sku', 'sku', { unique: false })
          }

          // Categories store
          if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
            const categoriesStore = db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id' })
            categoriesStore.createIndex('name', 'name', { unique: false })
          }

          // Product images store (stores blobs)
          if (!db.objectStoreNames.contains(PRODUCT_IMAGES_STORE)) {
            const imagesStore = db.createObjectStore(PRODUCT_IMAGES_STORE, { keyPath: 'productId' })
            imagesStore.createIndex('cachedAt', 'cachedAt', { unique: false })
          }

          // Sync metadata store
          if (!db.objectStoreNames.contains(SYNC_METADATA_STORE)) {
            db.createObjectStore(SYNC_METADATA_STORE, { keyPath: 'key' })
          }
        }
      }
    })

    return this.initPromise
  }

  // ==================== TRANSACTION METHODS ====================

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

  // ==================== PRODUCT METHODS ====================

  async saveProducts(products: CachedProduct[]): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readwrite')
      const store = tx.objectStore(PRODUCTS_STORE)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)

      // Clear existing products and add new ones
      store.clear()
      products.forEach(product => {
        store.add(product)
      })
    })
  }

  async getProduct(id: string): Promise<CachedProduct | null> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readonly')
      const store = tx.objectStore(PRODUCTS_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllProducts(): Promise<CachedProduct[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readonly')
      const store = tx.objectStore(PRODUCTS_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getProductsByCategory(categoryId: string): Promise<CachedProduct[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readonly')
      const store = tx.objectStore(PRODUCTS_STORE)
      const index = store.index('categoryId')
      const request = index.getAll(categoryId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async searchProducts(query: string): Promise<CachedProduct[]> {
    const allProducts = await this.getAllProducts()
    const lowerQuery = query.toLowerCase()
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.sku && p.sku.toLowerCase().includes(lowerQuery)) ||
      (p.barcode && p.barcode.toLowerCase().includes(lowerQuery))
    )
  }

  async getProductsCount(): Promise<number> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readonly')
      const store = tx.objectStore(PRODUCTS_STORE)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async clearProducts(): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], 'readwrite')
      const store = tx.objectStore(PRODUCTS_STORE)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // ==================== CATEGORY METHODS ====================

  async saveCategories(categories: CachedCategory[]): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CATEGORIES_STORE], 'readwrite')
      const store = tx.objectStore(CATEGORIES_STORE)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)

      // Clear existing categories and add new ones
      store.clear()
      categories.forEach(category => {
        store.add(category)
      })
    })
  }

  async getAllCategories(): Promise<CachedCategory[]> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CATEGORIES_STORE], 'readonly')
      const store = tx.objectStore(CATEGORIES_STORE)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async clearCategories(): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([CATEGORIES_STORE], 'readwrite')
      const store = tx.objectStore(CATEGORIES_STORE)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // ==================== PRODUCT IMAGE METHODS ====================

  async saveProductImage(productId: string, blob: Blob, mimeType: string): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCT_IMAGES_STORE], 'readwrite')
      const store = tx.objectStore(PRODUCT_IMAGES_STORE)
      
      const imageData: CachedProductImage = {
        productId,
        blob,
        mimeType,
        cachedAt: Date.now()
      }
      
      const request = store.put(imageData)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getProductImage(productId: string): Promise<CachedProductImage | null> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCT_IMAGES_STORE], 'readonly')
      const store = tx.objectStore(PRODUCT_IMAGES_STORE)
      const request = store.get(productId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteProductImage(productId: string): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCT_IMAGES_STORE], 'readwrite')
      const store = tx.objectStore(PRODUCT_IMAGES_STORE)
      const request = store.delete(productId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async clearProductImages(): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCT_IMAGES_STORE], 'readwrite')
      const store = tx.objectStore(PRODUCT_IMAGES_STORE)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getProductImagesCount(): Promise<number> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCT_IMAGES_STORE], 'readonly')
      const store = tx.objectStore(PRODUCT_IMAGES_STORE)
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // ==================== SYNC METADATA METHODS ====================

  async setSyncMetadata(key: string, value: any): Promise<void> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SYNC_METADATA_STORE], 'readwrite')
      const store = tx.objectStore(SYNC_METADATA_STORE)
      
      const metadata: SyncMetadata = {
        key,
        value,
        updatedAt: Date.now()
      }
      
      const request = store.put(metadata)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getSyncMetadata(key: string): Promise<SyncMetadata | null> {
    const db = await this.init()
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SYNC_METADATA_STORE], 'readonly')
      const store = tx.objectStore(SYNC_METADATA_STORE)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getLastSyncTime(): Promise<number | null> {
    const metadata = await this.getSyncMetadata('lastSync')
    return metadata?.value || null
  }

  async setLastSyncTime(timestamp: number): Promise<void> {
    await this.setSyncMetadata('lastSync', timestamp)
  }

  // ==================== UTILITY METHODS ====================

  async clearAllProductData(): Promise<void> {
    await Promise.all([
      this.clearProducts(),
      this.clearCategories(),
      this.clearProductImages(),
      this.setSyncMetadata('lastSync', null)
    ])
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager()
