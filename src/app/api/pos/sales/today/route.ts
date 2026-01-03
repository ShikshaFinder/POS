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

    const organizationId = (session.user as any).currentOrganizationId
    
    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Fetch today's invoices (representing completed sales)
    const sales = await prisma.invoice.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: 'PAID'
      },
      include: {
        salesOrder: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate stats
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    const totalOrders = sales.length
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Format response
    const formattedSales = sales.map(sale => ({
      id: sale.id,
      customerName: sale.customerName,
      totalAmount: sale.totalAmount,
      createdAt: sale.createdAt.toISOString(),
      items: sale.salesOrder?.items.map(item => ({
        product: {
          name: item.product.name
        },
        quantity: item.qty,
        price: item.price
      })) || []
    }))

    return NextResponse.json({
      sales: formattedSales,
      stats: {
        totalSales,
        totalOrders,
        averageOrderValue
      }
    })
  } catch (error) {
    console.error('Error fetching today\'s sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}
