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
      const stocks = await prisma.inventoryStock.findMany({
        where: {
          organizationId,
          ...(filter === 'out' && {
            quantity: 0
          }),
          ...(search && {
            product: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
              ]
            }
          })
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unit: true,
              category: true,
              reorderLevel: true
            }
          },
          storageLocation: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          quantity: 'asc'
        }
      })

      console.log(`Stock API: Found ${stocks.length} records`)

      // Filter low stock in application code
      let filteredStocks = stocks
      if (filter === 'low') {
        filteredStocks = stocks.filter(stock =>
          stock.product.reorderLevel && stock.quantity <= stock.product.reorderLevel
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
