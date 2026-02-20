import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Validates transaction items before syncing
 * Checks if products exist and have sufficient stock
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { items } = await req.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items to validate' }, { status: 400 })
    }

    const invalidItems: string[] = []
    const errors: string[] = []

    // Get all product IDs
    const productIds = items.map((item: any) => item.productId).filter(Boolean)

    if (productIds.length === 0) {
      return NextResponse.json({ error: 'No valid product IDs found' }, { status: 400 })
    }

    const posLocationId = (session.user as any).posLocationId
    const posType = (session.user as any).posType

    // Fetch all products in one query
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        currentStock: true,
        ...(posType === 'NON_DAIRY' && posLocationId && {
          posStock: {
            where: { posLocationId },
            select: { currentStock: true }
          }
        }),
        ...(posType !== 'NON_DAIRY' && {
          inventoryStocks: {
            select: { quantity: true }
          }
        })
      }
    })

    const productMap = new Map(products.map(p => [p.id, p]))

    // Validate each item
    for (const item of items) {
      const product = productMap.get(item.productId)

      if (!product) {
        invalidItems.push(item.productId)
        errors.push(`Product ${item.productId} not found`)
        continue
      }

      const requestedQty = item.quantity || item.qty || 0

      let availableStock = 0;
      if (posType === 'NON_DAIRY' && posLocationId) {
        availableStock = (product as any).posStock?.[0]?.currentStock ?? 0;
      } else if (posType !== 'NON_DAIRY' && (product as any).inventoryStocks && (product as any).inventoryStocks.length > 0) {
        availableStock = (product as any).inventoryStocks.reduce((sum: number, stock: any) => sum + stock.quantity, 0);
      } else {
        availableStock = (product as any).currentStock ?? 0;
      }

      if (availableStock < requestedQty) {
        invalidItems.push(item.productId)
        errors.push(`Insufficient stock for "${product.name}": requested ${requestedQty}, available ${availableStock}`)
      }
    }

    if (invalidItems.length > 0) {
      return NextResponse.json(
        {
          valid: false,
          error: errors.join('; '),
          invalidItems,
          details: errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      message: 'All items validated successfully'
    })

  } catch (error: any) {
    console.error('Transaction validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Validation failed' },
      { status: 500 }
    )
  }
}
