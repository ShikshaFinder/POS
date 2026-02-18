'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { productSyncService } from '@/lib/productSyncService'
import { getCachedImageUrl } from '@/lib/imageCache'
import { CachedProduct } from '@/lib/indexedDB'
import { toast } from 'sonner'

export interface OfflineProduct extends CachedProduct {
  cachedImageUrl?: string | null
}

interface UseOfflineProductsOptions {
  search?: string
  categoryId?: string | null
  autoSync?: boolean
}

interface UseOfflineProductsReturn {
  products: OfflineProduct[]
  loading: boolean
  isUsingCache: boolean
  refetch: () => Promise<void>
}

/**
 * Hook for offline-first product data fetching.
 * Tries cached data from IndexedDB first, then falls back to network.
 * Optionally triggers an auto-sync when no cached data exists.
 */
export function useOfflineProducts({
  search,
  categoryId,
  autoSync = true,
}: UseOfflineProductsOptions = {}): UseOfflineProductsReturn {
  const [products, setProducts] = useState<OfflineProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isUsingCache, setIsUsingCache] = useState(false)
  const autoSyncTriggered = useRef(false)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)

      const hasCachedData = await productSyncService.hasCachedData()

      if (hasCachedData) {
        // Use cached products from IndexedDB
        const resolvedCategoryId = categoryId && !categoryId.startsWith('legacy_')
          ? categoryId
          : undefined

        let cachedProducts = await productSyncService.getProducts({
          search: search || undefined,
          categoryId: resolvedCategoryId,
        })

        // Handle legacy category filtering
        if (categoryId?.startsWith('legacy_')) {
          const legacyCat = categoryId.replace('legacy_', '')
          cachedProducts = cachedProducts.filter(p => p.category === legacyCat)
        }

        // Load cached image URLs
        const productsWithImages: OfflineProduct[] = await Promise.all(
          cachedProducts.map(async (product) => {
            const cachedImageUrl = product.hasLocalImage
              ? await getCachedImageUrl(product.id)
              : null
            return { ...product, cachedImageUrl }
          })
        )

        setProducts(productsWithImages)
        setIsUsingCache(true)
        return
      }

      // No cached data — try auto-sync once
      if (autoSync && !autoSyncTriggered.current && navigator.onLine) {
        autoSyncTriggered.current = true
        toast.info('Syncing products for offline use...')
        const result = await productSyncService.syncAll()
        if (result.success) {
          toast.success(`Synced ${result.productsCount} products for offline use`)
          // Re-fetch from cache after sync
          const synced = await productSyncService.getProducts({
            search: search || undefined,
            categoryId: categoryId && !categoryId.startsWith('legacy_') ? categoryId : undefined,
          })
          const withImages: OfflineProduct[] = await Promise.all(
            synced.map(async (product) => {
              const cachedImageUrl = product.hasLocalImage
                ? await getCachedImageUrl(product.id)
                : null
              return { ...product, cachedImageUrl }
            })
          )
          setProducts(withImages)
          setIsUsingCache(true)
          return
        }
      }

      // Fall back to network API
      setIsUsingCache(false)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (categoryId && !categoryId.startsWith('legacy_')) {
        params.append('categoryId', categoryId)
      }

      const res = await fetch(`/api/pos/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        let filtered = data.products || []

        if (categoryId?.startsWith('legacy_')) {
          const legacyCat = categoryId.replace('legacy_', '')
          filtered = filtered.filter((p: OfflineProduct) => p.category === legacyCat)
        }

        setProducts(filtered)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      // Try cache on network failure
      const hasCachedData = await productSyncService.hasCachedData()
      if (hasCachedData) {
        const cachedProducts = await productSyncService.getProducts()
        const productsWithImages: OfflineProduct[] = await Promise.all(
          cachedProducts.map(async (product) => {
            const cachedImageUrl = product.hasLocalImage
              ? await getCachedImageUrl(product.id)
              : null
            return { ...product, cachedImageUrl }
          })
        )
        setProducts(productsWithImages)
        setIsUsingCache(true)
        toast.info('Using offline product data')
      } else {
        toast.error('Failed to load products')
      }
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, autoSync])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    products,
    loading,
    isUsingCache,
    refetch: fetchProducts,
  }
}
