import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/reports/payments - Payment method breakdown
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const { searchParams } = new URL(req.url)
        const dateFrom = searchParams.get('dateFrom') || new Date().toISOString().slice(0, 10)
        const dateTo = searchParams.get('dateTo') || dateFrom

        const startDate = new Date(dateFrom + 'T00:00:00.000Z')
        const endDate = new Date(dateTo + 'T23:59:59.999Z')

        // Get transactions
        const transactions = await prisma.pOSTransaction.findMany({
            where: {
                organizationId,
                status: 'COMPLETED',
                transactionDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                paymentMethod: true,
                totalAmount: true,
                cashAmount: true,
                cardAmount: true,
                upiAmount: true,
                walletAmount: true,
                transactionDate: true
            }
        })

        // Aggregate by payment method
        const methods: Record<string, { count: number; amount: number }> = {
            CASH: { count: 0, amount: 0 },
            CARD: { count: 0, amount: 0 },
            UPI: { count: 0, amount: 0 },
            WALLET: { count: 0, amount: 0 },
            SPLIT: { count: 0, amount: 0 }
        }

        // Also track split payment breakdown
        let splitCash = 0, splitCard = 0, splitUPI = 0, splitWallet = 0

        transactions.forEach(t => {
            methods[t.paymentMethod].count += 1
            methods[t.paymentMethod].amount += t.totalAmount

            if (t.paymentMethod === 'SPLIT') {
                splitCash += t.cashAmount || 0
                splitCard += t.cardAmount || 0
                splitUPI += t.upiAmount || 0
                splitWallet += t.walletAmount || 0
            }
        })

        // Daily breakdown for chart
        const dailyBreakdown: Record<string, Record<string, number>> = {}
        transactions.forEach(t => {
            const day = t.transactionDate.toISOString().slice(0, 10)
            if (!dailyBreakdown[day]) {
                dailyBreakdown[day] = { CASH: 0, CARD: 0, UPI: 0, WALLET: 0, SPLIT: 0 }
            }
            dailyBreakdown[day][t.paymentMethod] += t.totalAmount
        })

        const dailyData = Object.entries(dailyBreakdown)
            .map(([date, methods]) => ({ date, ...methods }))
            .sort((a, b) => a.date.localeCompare(b.date))

        const totalAmount = Object.values(methods).reduce((sum, m) => sum + m.amount, 0)
        const totalTransactions = Object.values(methods).reduce((sum, m) => sum + m.count, 0)

        return NextResponse.json({
            dateRange: { from: dateFrom, to: dateTo },
            summary: {
                totalAmount,
                totalTransactions
            },
            methods: Object.entries(methods).map(([method, data]) => ({
                method,
                count: data.count,
                amount: data.amount,
                percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
            })),
            splitBreakdown: {
                cash: splitCash,
                card: splitCard,
                upi: splitUPI,
                wallet: splitWallet
            },
            dailyData
        })
    } catch (error) {
        console.error('Error fetching payment report:', error)
        return NextResponse.json(
            { error: 'Failed to fetch payment report' },
            { status: 500 }
        )
    }
}
