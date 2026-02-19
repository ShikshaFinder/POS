
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const filter = searchParams.get('filter') // 'all', 'low', 'out'

    // POS context
    const organizationId = (session.user as any).currentOrganizationId
    const posLocationId = (session.user as any).posLocationId
    const posType = (session.user as any).posType

    if (!posLocationId) {
      return NextResponse.json({ error: 'POS Location not found in session' }, { status: 400 })
    }


    // Common Product Fetch Logic
    const productWhere: any = {
      organizationId,
    }

    if (search) {
      productWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Include relations based on POS Type
    const include: any = {
      inventoryStocks: posType === 'DAIRY_ASSOCIATED' ? {
        include: { storageLocation: true }
      } : false,
      posStock: posType !== 'DAIRY_ASSOCIATED' ? {
        where: { posLocationId }
      } : false
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      include: include,
      orderBy: { name: 'asc' }
    })

    let mappedStocks: any[] = []

    if (posType === 'DAIRY_ASSOCIATED') {
      mappedStocks = products.flatMap(product => {
        const stocks = (product as any).inventoryStocks || []

        if (stocks.length > 0) {
          // Return one entry per storage location
          return stocks.map((stock: any) => ({
            id: stock.id, // Inventory Stock ID
            quantity: stock.quantity,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              unit: product.unit,
              category: product.category,
              reorderLevel: product.reorderLevel
            },
            storageLocation: {
              name: stock.storageLocation?.name || 'Main Warehouse'
            }
          }))
        } else {
          // Return entry with 0 stock
          return [{
            id: `virtual-${product.id}`,
            quantity: 0,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              unit: product.unit,
              category: product.category,
              reorderLevel: product.reorderLevel
            },
            storageLocation: {
              name: 'Main Warehouse'
            }
          }]
        }
      })
    } else {
      // NON_DAIRY Logic
      mappedStocks = products.map(product => {
        const stock = (product as any).posStock?.[0]
        return {
          id: stock?.id || `virtual-${product.id}`,
          quantity: stock?.currentStock || 0,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            category: product.category,
            reorderLevel: product.reorderLevel
          },
          storageLocation: {
            name: 'Local Stock' // Or fetch specific name if needed
          }
        }
      })
    }

    // Apply Filter (in memory now, as we built the list from Products)
    if (filter === 'out') {
      mappedStocks = mappedStocks.filter(s => s.quantity <= 0)
    } else if (filter === 'low') {
      mappedStocks = mappedStocks.filter(s => s.quantity > 0 && s.quantity <= (s.product.reorderLevel || 0))
    }
    // 'all' passes everything (including 0 stock)

    return NextResponse.json({ stocks: mappedStocks })
  } catch (error) {
    console.error('Failed to fetch stocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stocks' },
      { status: 500 }
    )
  }
}
