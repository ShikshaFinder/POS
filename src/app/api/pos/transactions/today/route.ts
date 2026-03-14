import { authenticateRequest } from '@/lib/auth-mobile'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.currentOrganizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const transactions = await prisma.pOSTransaction.findMany({
      where: {
        organizationId: user.currentOrganizationId,
        transactionDate: {
          gte: today,
          lt: tomorrow,
        },
        status: 'COMPLETED',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
    })

    // Calculate stats
    const totalSales = transactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0
    )
    const totalOrders = transactions.length
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    return NextResponse.json({
      transactions,
      stats: {
        totalSales,
        totalOrders,
        averageOrderValue,
      },
    })
  } catch (error) {
    console.error('Failed to fetch today transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
