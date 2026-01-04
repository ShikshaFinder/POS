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
    const userId = (session.user as any).id

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Today's POS transactions
    const todayTransactions = await prisma.pOSTransaction.findMany({
      where: {
        organizationId,
        transactionDate: {
          gte: today,
          lt: tomorrow
        },
        status: 'COMPLETED'
      },
      orderBy: { transactionDate: 'desc' }
    })

    const todaySales = todayTransactions.reduce((sum, t) => sum + t.totalAmount, 0)
    const todayTransactionCount = todayTransactions.length
    const averageTicket = todayTransactionCount > 0 ? todaySales / todayTransactionCount : 0

    // Payment breakdown
    const paymentBreakdown = {
      cash: todayTransactions.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + t.totalAmount, 0),
      card: todayTransactions.filter(t => t.paymentMethod === 'CARD').reduce((sum, t) => sum + t.totalAmount, 0),
      upi: todayTransactions.filter(t => t.paymentMethod === 'UPI').reduce((sum, t) => sum + t.totalAmount, 0),
      wallet: todayTransactions.filter(t => t.paymentMethod === 'WALLET').reduce((sum, t) => sum + t.totalAmount, 0)
    }

    // Recent transactions
    const recentTransactions = todayTransactions.slice(0, 5).map(t => ({
      receiptNumber: t.receiptNumber,
      amount: t.totalAmount,
      time: t.transactionDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      paymentMethod: t.paymentMethod
    }))

    // Low stock items
    const lowStockItems = await prisma.product.count({
      where: {
        organizationId,
        AND: [
          { currentStock: { not: null } },
          { reorderLevel: { not: null } },
          { currentStock: { lte: 10 } } // Threshold
        ]
      }
    })

    // Total POS customers
    const totalCustomers = await prisma.pOSCustomer.count({
      where: { organizationId }
    })

    // Active session for current user
    const activeSession = await prisma.pOSSession.findFirst({
      where: {
        organizationId,
        cashierId: userId,
        status: 'OPEN'
      }
    })

    return NextResponse.json({
      todaySales,
      todayTransactions: todayTransactionCount,
      averageTicket,
      lowStockItems,
      totalCustomers,
      paymentBreakdown,
      recentTransactions,
      activeSession: activeSession ? {
        sessionNumber: activeSession.sessionNumber,
        openedAt: activeSession.openedAt.toISOString(),
        totalSales: activeSession.totalSales
      } : null
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
