import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/reports/products - Product-wise sales report
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

        // Get all transaction items in date range
        const transactionItems = await prisma.pOSTransactionItem.findMany({
            where: {
                transaction: {
                    organizationId,
                    status: 'COMPLETED',
                    transactionDate: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            },
            include: {
                transaction: {
                    select: {
                        transactionDate: true
                    }
                }
            }
        })

        // Aggregate by product
        const productSales: Record<string, {
            productId: string
            productName: string
            sku: string
            quantitySold: number
            revenue: number
            discount: number
            netRevenue: number
            transactionCount: number
        }> = {}

        transactionItems.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    productId: item.productId,
                    productName: item.productName,
                    sku: item.productSku || '',
                    quantitySold: 0,
                    revenue: 0,
                    discount: 0,
                    netRevenue: 0,
                    transactionCount: 0
                }
            }
            productSales[item.productId].quantitySold += item.quantity
            productSales[item.productId].revenue += item.subtotal
            productSales[item.productId].discount += item.discountAmount
            productSales[item.productId].netRevenue += item.total
            productSales[item.productId].transactionCount += 1
        })

        // Sort by revenue
        const products = Object.values(productSales).sort((a, b) => b.netRevenue - a.netRevenue)

        // Calculate totals
        const totals = products.reduce(
            (acc, p) => ({
                quantitySold: acc.quantitySold + p.quantitySold,
                revenue: acc.revenue + p.revenue,
                discount: acc.discount + p.discount,
                netRevenue: acc.netRevenue + p.netRevenue
            }),
            { quantitySold: 0, revenue: 0, discount: 0, netRevenue: 0 }
        )

        return NextResponse.json({
            dateRange: { from: dateFrom, to: dateTo },
            totals,
            products
        })
    } catch (error) {
        console.error('Error fetching product report:', error)
        return NextResponse.json(
            { error: 'Failed to fetch product report' },
            { status: 500 }
        )
    }
}
