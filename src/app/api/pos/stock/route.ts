import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('Stock API: No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    console.log('Stock API: Fetching for org:', organizationId)

    if (!organizationId) {
      console.error('Stock API: Missing organizationId in session')
      return NextResponse.json({ error: 'Organization ID missing' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') // 'all', 'low', 'out'
    const search = searchParams.get('search')

    try {
      // Fetch all products with their inventory stocks
      const products = await prisma.product.findMany({
        where: {
          organizationId,
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          inventoryStocks: {
            where: {
              organizationId: organizationId
            },
            include: {
              storageLocation: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      })

      console.log(`Stock API: Found ${products.length} products`)

      // Transform products to stock format
      const stocks = products.flatMap(product => {
        if (product.inventoryStocks.length === 0) {
          // Product with no InventoryStock records - use currentStock from Product table
          return [{
            id: product.id,
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku || 'N/A',
              unit: product.unit || 'PIECE',
              category: product.category || 'UNCATEGORIZED',
              reorderLevel: product.reorderLevel || 0
            },
            quantity: product.currentStock || 0,
            storageLocation: {
              name: 'Default Storage'
            }
          }]
        }
        // Product with InventoryStock records - create entry for each storage location
        return product.inventoryStocks.map(stock => ({
          id: stock.id,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku || 'N/A',
            unit: product.unit || 'PIECE',
            category: product.category || 'UNCATEGORIZED',
            reorderLevel: product.reorderLevel || 0
          },
          quantity: stock.quantity,
          storageLocation: stock.storageLocation
        }))
      })

      console.log(`Stock API: Transformed to ${stocks.length} stock records`)

      // Apply filters
      let filteredStocks = stocks
      if (filter === 'out') {
        filteredStocks = stocks.filter(stock => stock.quantity === 0)
      } else if (filter === 'low') {
        filteredStocks = stocks.filter(stock =>
          stock.quantity > 0 && stock.quantity <= stock.product.reorderLevel
        )
      }

      return NextResponse.json({ stocks: filteredStocks })
    } catch (dbError) {
      console.error('Stock API: Database error:', dbError)
      throw dbError
    }
  } catch (error) {
    console.error('Error fetching stock:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
