import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

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

    // Get today's invoices (which is what checkout creates)
    const todayInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        payments: true,
        salesOrder: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate totals
    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const todayTransactionCount = todayInvoices.length
    const averageTicket = todayTransactionCount > 0 ? todaySales / todayTransactionCount : 0

    // Payment breakdown from Payment records
    const todayPayments = await prisma.payment.findMany({
      where: {
        organizationId,
        paidAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    const paymentBreakdown = {
      cash: todayPayments
        .filter(p => p.method === 'CASH')
        .reduce((sum, p) => sum + p.amount, 0),
      card: todayPayments
        .filter(p => p.method === 'CARD')
        .reduce((sum, p) => sum + p.amount, 0),
      upi: todayPayments
        .filter(p => p.method === 'UPI')
        .reduce((sum, p) => sum + p.amount, 0),
      wallet: todayPayments
        .filter(p => p.method === 'WALLET' || p.method === 'MIXED')
        .reduce((sum, p) => sum + p.amount, 0)
    }

    // Recent transactions (from invoices)
    const recentTransactions = todayInvoices.slice(0, 5).map(inv => {
      const payment = inv.payments?.[0]
      return {
        receiptNumber: inv.invoiceNumber,
        amount: inv.totalAmount,
        time: format(new Date(inv.createdAt), 'hh:mm a'),
        paymentMethod: payment?.method || 'CASH'
      }
    })

    // Low stock items
    const lowStockItems = await prisma.product.count({
      where: {
        organizationId,
        currentStock: { lte: 10 },
        reorderLevel: { not: null }
      }
    })

    // Total customers (from Connection with type CUSTOMER)
    const totalCustomers = await prisma.connection.count({
      where: { 
        organizationId,
        type: 'CUSTOMER'
      }
    })

    // Try to get active POS session
    let activeSession = null
    try {
      const session = await prisma.pOSSession.findFirst({
        where: {
          organizationId,
          cashierId: userId,
          status: 'OPEN'
        }
      })
      
      if (session) {
        activeSession = {
          sessionNumber: session.sessionNumber,
          openedAt: session.openedAt.toISOString(),
          totalSales: session.totalSales
        }
      }
    } catch (e) {
      // POSSession table might not exist, ignore
      console.log('POSSession not available')
    }

    return NextResponse.json({
      todaySales,
      todayTransactions: todayTransactionCount,
      averageTicket,
      lowStockItems,
      totalCustomers,
      paymentBreakdown,
      recentTransactions,
      activeSession
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
