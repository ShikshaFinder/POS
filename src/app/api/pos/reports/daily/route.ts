import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/reports/daily - Daily sales report
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const { searchParams } = new URL(req.url)
        const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10)

        const startOfDay = new Date(dateStr + 'T00:00:00.000Z')
        const endOfDay = new Date(dateStr + 'T23:59:59.999Z')

        // Get transactions for the day
        const transactions = await prisma.pOSTransaction.findMany({
            where: {
                organizationId,
                status: 'COMPLETED',
                transactionDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                items: true,
                cashier: {
                    select: { 
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true
                            }
                        }
                    }
                }
            },
            orderBy: { transactionDate: 'asc' }
        })

        // Calculate totals
        const totalSales = transactions.reduce((sum, t) => sum + t.totalAmount, 0)
        const totalTransactions = transactions.length
        const totalDiscount = transactions.reduce((sum, t) => sum + t.discountAmount, 0)
        const totalTax = transactions.reduce((sum, t) => sum + t.taxAmount, 0)

        // Payment breakdown
        const paymentBreakdown = {
            cash: transactions.filter(t => t.paymentMethod === 'CASH').reduce((sum, t) => sum + t.totalAmount, 0),
            card: transactions.filter(t => t.paymentMethod === 'CARD').reduce((sum, t) => sum + t.totalAmount, 0),
            upi: transactions.filter(t => t.paymentMethod === 'UPI').reduce((sum, t) => sum + t.totalAmount, 0),
            wallet: transactions.filter(t => t.paymentMethod === 'WALLET').reduce((sum, t) => sum + t.totalAmount, 0),
            split: transactions.filter(t => t.paymentMethod === 'SPLIT').reduce((sum, t) => sum + t.totalAmount, 0)
        }

        // Hourly breakdown
        const hourlyBreakdown: { hour: number; sales: number; transactions: number }[] = []
        for (let hour = 0; hour < 24; hour++) {
            const hourTransactions = transactions.filter(t => {
                const txHour = new Date(t.transactionDate).getHours()
                return txHour === hour
            })
            hourlyBreakdown.push({
                hour,
                sales: hourTransactions.reduce((sum, t) => sum + t.totalAmount, 0),
                transactions: hourTransactions.length
            })
        }

        // Top products
        const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
        transactions.forEach(t => {
            t.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 }
                }
                productSales[item.productId].quantity += item.quantity
                productSales[item.productId].revenue += item.total
            })
        })
        const topProducts = Object.entries(productSales)
            .map(([id, data]) => ({ productId: id, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // Cashier breakdown
        const cashierBreakdown: Record<string, { name: string; sales: number; transactions: number }> = {}
        transactions.forEach(t => {
            const cashierId = t.cashierId || 'unknown'
            const cashierName = t.cashier?.profile?.fullName || t.cashier?.email || 'Unknown'
            if (!cashierBreakdown[cashierId]) {
                cashierBreakdown[cashierId] = { name: cashierName, sales: 0, transactions: 0 }
            }
            cashierBreakdown[cashierId].sales += t.totalAmount
            cashierBreakdown[cashierId].transactions += 1
        })
        const cashiers = Object.entries(cashierBreakdown)
            .map(([id, data]) => ({ cashierId: id, ...data }))
            .sort((a, b) => b.sales - a.sales)

        return NextResponse.json({
            date: dateStr,
            summary: {
                totalSales,
                totalTransactions,
                totalDiscount,
                totalTax,
                averageTicket: totalTransactions > 0 ? totalSales / totalTransactions : 0
            },
            paymentBreakdown,
            hourlyBreakdown,
            topProducts,
            cashiers,
            transactions: transactions.map(t => ({
                id: t.id,
                receiptNumber: t.receiptNumber,
                time: t.transactionDate,
                amount: t.totalAmount,
                paymentMethod: t.paymentMethod,
                itemCount: t.items.length
            }))
        })
    } catch (error) {
        console.error('Error fetching daily report:', error)
        return NextResponse.json(
            { error: 'Failed to fetch daily report' },
            { status: 500 }
        )
    }
}
