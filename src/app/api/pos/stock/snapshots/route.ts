import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get today's stock snapshot for this POS location
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = (session.user as any).id

        // Get user's POS location
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedPOSLocations: { take: 1 }
            }
        })

        if (!user?.ownedPOSLocations?.[0]) {
            return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 })
        }

        const posLocationId = user.ownedPOSLocations[0].id
        const organizationId = user.ownedPOSLocations[0].organizationId

        const { searchParams } = new URL(req.url)
        const date = searchParams.get('date')
        const snapshotSession = searchParams.get('session') || 'EOD'

        // Get today's date or specified date
        const targetDate = date ? new Date(date) : new Date()
        targetDate.setHours(0, 0, 0, 0)

        // Get snapshots for this date
        const snapshots = await prisma.stockSnapshot.findMany({
            where: {
                organizationId,
                posLocationId,
                date: targetDate,
                session: snapshotSession
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        unit: true,
                        category: true
                    }
                },
                verifiedBy: {
                    select: {
                        email: true,
                        profile: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ snapshots, date: targetDate, session: snapshotSession })
    } catch (error) {
        console.error('Error fetching snapshots:', error)
        return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })
    }
}

// POST - Create/update stock snapshot with physical count
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = (session.user as any).id

        // Get user's POS location
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                ownedPOSLocations: { take: 1 }
            }
        })

        if (!user?.ownedPOSLocations?.[0]) {
            return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 })
        }

        const posLocation = user.ownedPOSLocations[0]
        const posLocationId = posLocation.id
        const organizationId = posLocation.organizationId

        const body = await req.json()
        const { products, snapshotSession = 'EOD' } = body

        if (!products || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: 'Products array is required' }, { status: 400 })
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const results = []

        for (const product of products) {
            const { productId, physicalStock, varianceReason, notes } = product

            // Get current system stock
            const posStock = await prisma.pOSProductStock.findUnique({
                where: {
                    posLocationId_productId: {
                        posLocationId,
                        productId
                    }
                }
            })

            const systemStock = posStock?.currentStock || 0
            const variance = physicalStock != null ? physicalStock - systemStock : null
            const variancePercent = physicalStock != null && systemStock > 0
                ? ((physicalStock - systemStock) / systemStock) * 100
                : null

            // Check if variance exceeds threshold
            const varianceThreshold = posLocation.varianceAlertThreshold || 5
            const isFlagged = variancePercent != null && Math.abs(variancePercent) > varianceThreshold

            // Upsert snapshot
            const snapshot = await prisma.stockSnapshot.upsert({
                where: {
                    organizationId_posLocationId_productId_date_session: {
                        organizationId,
                        posLocationId,
                        productId,
                        date: today,
                        session: snapshotSession
                    }
                },
                create: {
                    organizationId,
                    posLocationId,
                    productId,
                    date: today,
                    session: snapshotSession,
                    openingStock: systemStock,
                    closingStock: systemStock,
                    systemStock,
                    physicalStock,
                    variance,
                    variancePercent,
                    varianceReason,
                    status: physicalStock != null ? (isFlagged ? 'FLAGGED' : 'VERIFIED') : 'PENDING',
                    verifiedById: physicalStock != null ? userId : null,
                    verifiedAt: physicalStock != null ? new Date() : null,
                    notes
                },
                update: {
                    closingStock: systemStock,
                    systemStock,
                    physicalStock,
                    variance,
                    variancePercent,
                    varianceReason,
                    status: physicalStock != null ? (isFlagged ? 'FLAGGED' : 'VERIFIED') : 'PENDING',
                    verifiedById: physicalStock != null ? userId : null,
                    verifiedAt: physicalStock != null ? new Date() : null,
                    notes
                }
            })

            results.push(snapshot)
        }

        return NextResponse.json({
            message: `Created/updated ${results.length} snapshots`,
            snapshots: results
        })
    } catch (error) {
        console.error('Error creating snapshots:', error)
        return NextResponse.json({ error: 'Failed to create snapshots' }, { status: 500 })
    }
}
