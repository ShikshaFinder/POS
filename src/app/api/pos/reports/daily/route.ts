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
        const dateStr = searchParams.get('date') || new Date().toLocaleDateString('en-CA')

        // Parse date in local timezone, not UTC
        const [year, month, day] = dateStr.split('-').map(Number)
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

        // Fetch invoices (representing completed sales) for the day
        // Include both PAID and PARTIALLY_PAID to avoid undercounting revenue
        const invoices = await prisma.invoice.findMany({
            where: {
                organizationId,
                status: { in: ['PAID', 'PARTIALLY_PAID'] },
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                payments: true,
                salesOrder: {
                    include: {
                        items: {
                            include: {
                                product: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        // Calculate totals
        const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        const totalTransactions = invoices.length

        // For discount and tax, we'll approximate from the difference
        // (In future, these could be stored in Invoice model)
        const totalDiscount = 0
        const totalTax = 0

        // Payment breakdown - aggregate from Payment records
        const paymentBreakdown = {
            cash: 0,
            card: 0,
            upi: 0,
            wallet: 0,
            split: 0
        }

        invoices.forEach(inv => {
            inv.payments.forEach(payment => {
                const method = payment.method.toUpperCase()
                const amount = payment.amount

                if (method === 'CASH') {
                    paymentBreakdown.cash += amount
                } else if (method === 'CARD') {
                    paymentBreakdown.card += amount
                } else if (method === 'UPI') {
                    paymentBreakdown.upi += amount
                } else if (method === 'WALLET') {
                    paymentBreakdown.wallet += amount
                } else if (method === 'SPLIT') {
                    // Parse referenceNo JSON to get split details
                    try {
                        if (payment.referenceNo) {
                            const splitData = JSON.parse(payment.referenceNo)
                            paymentBreakdown.cash += splitData.cashAmount || 0
                            paymentBreakdown.card += splitData.cardAmount || 0
                            paymentBreakdown.upi += splitData.upiAmount || 0
                            paymentBreakdown.wallet += splitData.walletAmount || 0
                        }
                    } catch (e) {
                        // If parsing fails, just add to split
                        paymentBreakdown.split += amount
                    }
                }
            })
        })

        // Hourly breakdown
        const hourlyBreakdown: { hour: number; sales: number; transactions: number }[] = []
        for (let hour = 0; hour < 24; hour++) {
            const hourInvoices = invoices.filter(inv => {
                const invHour = new Date(inv.createdAt).getHours()
                return invHour === hour
            })
            hourlyBreakdown.push({
                hour,
                sales: hourInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
                transactions: hourInvoices.length
            })
        }

        // Top products - aggregate from order items
        const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {}
        invoices.forEach(inv => {
            inv.salesOrder?.items.forEach(item => {
                const productId = item.productId
                const productName = item.product.name
                const quantity = item.qty
                const revenue = item.price * item.qty

                if (!productSales[productId]) {
                    productSales[productId] = { name: productName, quantity: 0, revenue: 0 }
                }
                productSales[productId].quantity += quantity
                productSales[productId].revenue += revenue
            })
        })

        const topProducts = Object.entries(productSales)
            .map(([id, data]) => ({ productId: id, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)

        // Cashier breakdown - Currently not tracked in Invoice model
        // We'll return empty array for now, or can enhance Invoice model later
        const cashiers: any[] = []

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
            transactions: invoices.map(inv => ({
                id: inv.id,
                receiptNumber: inv.invoiceNumber,
                time: inv.createdAt,
                amount: inv.totalAmount,
                paymentMethod: inv.payments[0]?.method || 'UNKNOWN',
                itemCount: inv.salesOrder?.items.length || 0
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
