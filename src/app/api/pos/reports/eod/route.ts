import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get EOD reports for this POS
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = (session.user as any).id

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { ownedPOSLocations: { take: 1 } }
        })

        if (!user?.ownedPOSLocations?.[0]) {
            return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 })
        }

        const posLocationId = user.ownedPOSLocations[0].id
        const organizationId = user.ownedPOSLocations[0].organizationId

        const { searchParams } = new URL(req.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const limit = parseInt(searchParams.get('limit') || '30')

        const where: any = {
            organizationId,
            posLocationId,
            reportType: 'DAILY'
        }

        if (startDate || endDate) {
            where.reportDate = {}
            if (startDate) where.reportDate.gte = new Date(startDate)
            if (endDate) where.reportDate.lte = new Date(endDate)
        }

        const reports = await (prisma as any).eODReport.findMany({
            where,
            orderBy: { reportDate: 'desc' },
            take: limit
        })

        return NextResponse.json({ reports })
    } catch (error) {
        console.error('Error fetching EOD reports:', error)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }
}

// POST - Generate today's EOD report
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = (session.user as any).id

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { ownedPOSLocations: { take: 1 } }
        })

        if (!user?.ownedPOSLocations?.[0]) {
            return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 })
        }

        const posLocation = user.ownedPOSLocations[0]
        const posLocationId = posLocation.id
        const organizationId = posLocation.organizationId

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endOfDay = new Date(today)
        endOfDay.setHours(23, 59, 59, 999)

        // Get sales data
        const salesData = await prisma.pOSTransaction.aggregate({
            where: {
                posLocationId,
                transactionDate: { gte: today, lte: endOfDay },
                status: 'COMPLETED'
            },
            _sum: { totalAmount: true },
            _count: { id: true }
        })

        // Get order count
        const orderCount = await prisma.pOSOrder.count({
            where: {
                posLocationId,
                createdAt: { gte: today, lte: endOfDay }
            }
        })

        // Get stock value
        const stocks = await prisma.pOSProductStock.findMany({
            where: { posLocationId },
            include: {
                product: { select: { markedPrice: true, unitPrice: true } }
            }
        })

        const stockValue = stocks.reduce((sum, s) => {
            const price = s.product.markedPrice || s.product.unitPrice || 0
            return sum + s.currentStock * price
        }, 0)

        // Get low stock count
        const lowStockCount = stocks.filter(s => s.currentStock < s.minimumStock).length

        // Get variance count
        const varianceCount = await (prisma as any).stockSnapshot.count({
            where: {
                posLocationId,
                date: today,
                status: 'FLAGGED'
            }
        })

        // Create/update EOD report
        const report = await (prisma as any).eODReport.upsert({
            where: {
                organizationId_posLocationId_reportDate_reportType: {
                    organizationId,
                    posLocationId,
                    reportDate: today,
                    reportType: 'DAILY'
                }
            },
            create: {
                organizationId,
                posLocationId,
                reportDate: today,
                reportType: 'DAILY',
                totalSales: salesData._sum.totalAmount || 0,
                totalTransactions: salesData._count.id || 0,
                totalOrders: orderCount,
                stockValue,
                lowStockCount,
                varianceCount,
                expiringCount: 0,
                highlights: {
                    generatedBy: userId,
                    generatedAt: new Date().toISOString(),
                    posName: posLocation.name
                }
            },
            update: {
                totalSales: salesData._sum.totalAmount || 0,
                totalTransactions: salesData._count.id || 0,
                totalOrders: orderCount,
                stockValue,
                lowStockCount,
                varianceCount,
                highlights: {
                    generatedBy: userId,
                    generatedAt: new Date().toISOString(),
                    posName: posLocation.name,
                    regenerated: true
                }
            }
        })

        return NextResponse.json({
            message: 'EOD report generated',
            report
        })
    } catch (error) {
        console.error('Error generating EOD report:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}
