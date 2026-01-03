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

    // Today's sales
    const todayInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: 'PAID'
      }
    })

    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const todayOrders = todayInvoices.length

    // Low stock items
    const lowStockItems = await prisma.product.count({
      where: {
        organizationId,
        currentStock: {
          lte: 10 // You can adjust this threshold
        }
      }
    })

    // Total customers (connections)
    const totalCustomers = await prisma.connection.count({
      where: {
        organizationId,
        type: 'CUSTOMER'
      }
    })

    return NextResponse.json({
      todaySales,
      todayOrders,
      lowStockItems,
      totalCustomers
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
