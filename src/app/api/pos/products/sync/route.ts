import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/pos/products/sync
 * Returns ALL products with full details for offline sync
 * This endpoint is optimized for bulk data transfer
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 401 })
    }

    // Fetch ALL products with images for offline sync
    const products = await prisma.product.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unitPrice: true,
        markedPrice: true,
        currentStock: true,
        reorderLevel: true,
        unit: true,
        category: true,
        categoryId: true,
        description: true,
        alias: true,
        packSize: true,
        subCategory: true,
        images: {
          where: {
            isPrimary: true
          },
          take: 1,
          select: {
            url: true
          }
        },
        productCategory: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { currentStock: 'desc' },
        { name: 'asc' }
      ]
    })

    // Transform products to include imageUrl and flat structure
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice,
      markedPrice: product.markedPrice,
      currentStock: product.currentStock,
      reorderLevel: product.reorderLevel,
      unit: product.unit,
      category: product.productCategory?.name || product.category,
      categoryId: product.categoryId || product.productCategory?.id || null,
      gstRate: 0, // Default GST rate
      imageUrl: product.images?.[0]?.url || null,
      description: product.description || null,
      barcode: product.alias || null, // DB field 'alias' maps to 'barcode' for POS display
      packSize: product.packSize || null,
      subCategory: product.subCategory || null
    }))

    return NextResponse.json({
      products: transformedProducts,
      syncedAt: Date.now()
    })
  } catch (error) {
    console.error('Error fetching products for sync:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products for sync' },
      { status: 500 }
    )
  }
}
