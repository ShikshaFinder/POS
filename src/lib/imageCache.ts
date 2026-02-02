/**
 * Image Cache Utility
 * Handles downloading and caching product images as blobs in IndexedDB
 */

import { indexedDBManager } from './indexedDB'

// Map to store blob URLs for cleanup
const blobUrlCache = new Map<string, string>()

/**
 * Downloads an image from a URL and stores it in IndexedDB
 * @param imageUrl - The remote image URL
 * @param productId - The product ID to associate with the image
 * @returns Promise<boolean> - Whether the image was cached successfully
 */
export async function downloadAndCacheImage(
  imageUrl: string,
  productId: string
): Promise<boolean> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit'
    })

    if (!response.ok) {
      console.warn(`Failed to fetch image for product ${productId}: ${response.status}`)
      return false
    }

    // Get the blob and mime type
    const blob = await response.blob()
    const mimeType = response.headers.get('content-type') || blob.type || 'image/jpeg'

    // Store in IndexedDB
    await indexedDBManager.saveProductImage(productId, blob, mimeType)
    
    return true
  } catch (error) {
    console.warn(`Failed to cache image for product ${productId}:`, error)
    return false
  }
}

/**
 * Gets a blob URL for a cached product image
 * @param productId - The product ID
 * @returns Promise<string | null> - The blob URL or null if not cached
 */
export async function getCachedImageUrl(productId: string): Promise<string | null> {
  try {
    // Check if we already have a blob URL in memory
    if (blobUrlCache.has(productId)) {
      return blobUrlCache.get(productId)!
    }

    // Try to get from IndexedDB
    const cachedImage = await indexedDBManager.getProductImage(productId)
    if (!cachedImage) {
      return null
    }

    // Create a blob URL
    const blobUrl = URL.createObjectURL(cachedImage.blob)
    blobUrlCache.set(productId, blobUrl)
    
    return blobUrl
  } catch (error) {
    console.warn(`Failed to get cached image for product ${productId}:`, error)
    return null
  }
}

/**
 * Checks if a product has a cached image
 * @param productId - The product ID
 * @returns Promise<boolean>
 */
export async function hasLocalImage(productId: string): Promise<boolean> {
  try {
    const cachedImage = await indexedDBManager.getProductImage(productId)
    return cachedImage !== null
  } catch {
    return false
  }
}

/**
 * Revokes a blob URL to free memory
 * @param productId - The product ID
 */
export function revokeCachedImageUrl(productId: string): void {
  const blobUrl = blobUrlCache.get(productId)
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
    blobUrlCache.delete(productId)
  }
}

/**
 * Revokes all blob URLs to free memory
 */
export function revokeAllCachedImageUrls(): void {
  blobUrlCache.forEach((url) => {
    URL.revokeObjectURL(url)
  })
  blobUrlCache.clear()
}

/**
 * Clears all cached images from IndexedDB and memory
 */
export async function clearAllCachedImages(): Promise<void> {
  revokeAllCachedImageUrls()
  await indexedDBManager.clearProductImages()
}

/**
 * Preloads cached images for a list of product IDs
 * Creates blob URLs in memory for faster access
 * @param productIds - Array of product IDs
 */
export async function preloadCachedImages(productIds: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  
  await Promise.all(
    productIds.map(async (productId) => {
      const url = await getCachedImageUrl(productId)
      if (url) {
        results.set(productId, url)
      }
    })
  )
  
  return results
}

/**
 * Gets the size of cached images in bytes (approximate)
 * @returns Promise<number> - Total size in bytes
 */
export async function getCachedImagesSize(): Promise<{ count: number; sizeBytes: number }> {
  const count = await indexedDBManager.getProductImagesCount()
  // Estimate: average image size is ~50KB
  const estimatedSizeBytes = count * 50 * 1024
  return { count, sizeBytes: estimatedSizeBytes }
}
