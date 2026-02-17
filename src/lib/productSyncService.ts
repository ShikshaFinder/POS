/**
 * Product Sync Service
 * Handles manual synchronization of products, categories, and images for offline use
 */

import { indexedDBManager, CachedProduct, CachedCategory } from './indexedDB'
import { downloadAndCacheImage, getCachedImageUrl, clearAllCachedImages } from './imageCache'

export interface SyncProgress {
  phase: 'idle' | 'fetching' | 'caching-images' | 'complete' | 'error'
  totalProducts: number
  syncedProducts: number
  totalImages: number
  cachedImages: number
  error?: string
}

export interface SyncResult {
  success: boolean
  productsCount: number
  categoriesCount: number
  imagesCount: number
  error?: string
}

type SyncProgressListener = (progress: SyncProgress) => void

class ProductSyncService {
  private listeners: Set<SyncProgressListener> = new Set()
  private isSyncing = false
  private currentProgress: SyncProgress = {
    phase: 'idle',
    totalProducts: 0,
    syncedProducts: 0,
    totalImages: 0,
    cachedImages: 0
  }

  /**
   * Subscribe to sync progress updates
   */
  subscribe(listener: SyncProgressListener): () => void {
    this.listeners.add(listener)
    listener(this.currentProgress) // Immediately call with current state
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentProgress))
  }

  private updateProgress(updates: Partial<SyncProgress>) {
    this.currentProgress = { ...this.currentProgress, ...updates }
    this.notifyListeners()
  }

  /**
   * Check if a sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return this.currentProgress
  }

  /**
   * Manually sync all products and categories from the server
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        productsCount: 0,
        categoriesCount: 0,
        imagesCount: 0,
        error: 'Sync already in progress'
      }
    }

    if (!navigator.onLine) {
      return {
        success: false,
        productsCount: 0,
        categoriesCount: 0,
        imagesCount: 0,
        error: 'No internet connection'
      }
    }

    this.isSyncing = true
    this.updateProgress({
      phase: 'fetching',
      totalProducts: 0,
      syncedProducts: 0,
      totalImages: 0,
      cachedImages: 0,
      error: undefined
    })

    try {
      // Fetch products and categories in parallel
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/pos/products/sync'),
        fetch('/api/pos/categories')
      ])

      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status}`)
      }

      if (!categoriesResponse.ok) {
        throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`)
      }

      const productsData = await productsResponse.json()
      const categoriesData = await categoriesResponse.json()

      const products = productsData.products || []
      const categories = categoriesData.categories || []

      this.updateProgress({
        totalProducts: products.length,
        syncedProducts: 0
      })

      // Transform and save products
      const now = Date.now()
      const cachedProducts: CachedProduct[] = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        unitPrice: p.unitPrice,
        markedPrice: p.markedPrice,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        unit: p.unit,
        category: p.category,
        categoryId: p.categoryId,
        gstRate: p.gstRate ?? 0,
        imageUrl: p.imageUrl,
        hasLocalImage: false, // Will update after caching images
        updatedAt: now
      }))

      // Save products to IndexedDB
      await indexedDBManager.saveProducts(cachedProducts)

      // Transform and save categories
      const cachedCategories: CachedCategory[] = categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        productCount: c.productCount || 0,
        updatedAt: now
      }))

      await indexedDBManager.saveCategories(cachedCategories)

      this.updateProgress({
        syncedProducts: products.length,
        phase: 'caching-images'
      })

      // Cache images for products that have them
      const productsWithImages = cachedProducts.filter(p => p.imageUrl)
      this.updateProgress({
        totalImages: productsWithImages.length,
        cachedImages: 0
      })

      let cachedImagesCount = 0
      
      // Cache images in batches to avoid overwhelming the browser
      const batchSize = 5
      for (let i = 0; i < productsWithImages.length; i += batchSize) {
        const batch = productsWithImages.slice(i, i + batchSize)
        
        await Promise.all(
          batch.map(async (product) => {
            if (product.imageUrl) {
              const success = await downloadAndCacheImage(product.imageUrl, product.id)
              if (success) {
                cachedImagesCount++
                // Update product to mark as having local image
                product.hasLocalImage = true
              }
            }
          })
        )

        this.updateProgress({
          cachedImages: cachedImagesCount
        })
      }

      // Save products again with updated hasLocalImage flags
      await indexedDBManager.saveProducts(cachedProducts)

      // Update last sync time
      await indexedDBManager.setLastSyncTime(now)

      this.updateProgress({
        phase: 'complete'
      })

      return {
        success: true,
        productsCount: products.length,
        categoriesCount: categories.length,
        imagesCount: cachedImagesCount
      }
    } catch (error: any) {
      console.error('Sync failed:', error)
      this.updateProgress({
        phase: 'error',
        error: error.message || 'Sync failed'
      })

      return {
        success: false,
        productsCount: 0,
        categoriesCount: 0,
        imagesCount: 0,
        error: error.message || 'Sync failed'
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Get all cached products
   */
  async getProducts(options?: {
    search?: string
    categoryId?: string
  }): Promise<CachedProduct[]> {
    try {
      let products: CachedProduct[]

      if (options?.categoryId) {
        products = await indexedDBManager.getProductsByCategory(options.categoryId)
      } else if (options?.search) {
        products = await indexedDBManager.searchProducts(options.search)
      } else {
        products = await indexedDBManager.getAllProducts()
      }

      // Apply additional filters if both are specified
      if (options?.categoryId && options?.search) {
        const lowerSearch = options.search.toLowerCase()
        products = products.filter(p =>
          p.name.toLowerCase().includes(lowerSearch) ||
          (p.sku && p.sku.toLowerCase().includes(lowerSearch))
        )
      }

      // Sort: in-stock items first, then by name
      products.sort((a, b) => {
        const stockA = a.currentStock ?? 0
        const stockB = b.currentStock ?? 0
        if (stockA > 0 && stockB <= 0) return -1
        if (stockB > 0 && stockA <= 0) return 1
        return a.name.localeCompare(b.name)
      })

      return products
    } catch (error) {
      console.error('Failed to get cached products:', error)
      return []
    }
  }

  /**
   * Get all cached categories
   */
  async getCategories(): Promise<CachedCategory[]> {
    try {
      return await indexedDBManager.getAllCategories()
    } catch (error) {
      console.error('Failed to get cached categories:', error)
      return []
    }
  }

  /**
   * Get a cached image URL for a product
   */
  async getProductImageUrl(productId: string): Promise<string | null> {
    return getCachedImageUrl(productId)
  }

  /**
   * Get the last sync timestamp
   */
  async getLastSyncTime(): Promise<number | null> {
    return indexedDBManager.getLastSyncTime()
  }

  /**
   * Check if we have cached data
   */
  async hasCachedData(): Promise<boolean> {
    const count = await indexedDBManager.getProductsCount()
    return count > 0
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    productsCount: number
    categoriesCount: number
    imagesCount: number
    lastSyncTime: number | null
  }> {
    const [productsCount, categories, imagesCount, lastSyncTime] = await Promise.all([
      indexedDBManager.getProductsCount(),
      indexedDBManager.getAllCategories(),
      indexedDBManager.getProductImagesCount(),
      indexedDBManager.getLastSyncTime()
    ])

    return {
      productsCount,
      categoriesCount: categories.length,
      imagesCount,
      lastSyncTime
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await indexedDBManager.clearAllProductData()
    await clearAllCachedImages()
    this.updateProgress({
      phase: 'idle',
      totalProducts: 0,
      syncedProducts: 0,
      totalImages: 0,
      cachedImages: 0,
      error: undefined
    })
  }
}

// Export singleton instance
export const productSyncService = new ProductSyncService()
