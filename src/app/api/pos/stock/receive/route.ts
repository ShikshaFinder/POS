import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get pending stock transfers for this POS to receive
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

        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status') || 'IN_TRANSIT'

        // Get transfers destined for this POS
        const transfers = await (prisma as any).stockTransferOrder.findMany({
            where: {
                toPosId: posLocationId,
                status: status === 'ALL' ? undefined : status
            },
            include: {
                fromPos: { select: { name: true, code: true } },
                fromStorage: { select: { name: true } },
                requestedBy: {
                    select: {
                        email: true,
                        profile: { select: { fullName: true } }
                    }
                },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true, unit: true, category: true }
                        }
                    }
                }
            },
            orderBy: { dispatchedAt: 'desc' }
        })

        return NextResponse.json({ transfers })
    } catch (error) {
        console.error('Error fetching transfers:', error)
        return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
    }
}

// POST - Receive a stock transfer
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

        const posLocationId = user.ownedPOSLocations[0].id

        const body = await req.json()
        const { transferId, receivedItems, notes } = body

        if (!transferId) {
            return NextResponse.json({ error: 'Transfer ID is required' }, { status: 400 })
        }

        // Verify transfer is for this POS and in transit
        const transfer = await (prisma as any).stockTransferOrder.findFirst({
            where: {
                id: transferId,
                toPosId: posLocationId,
                status: 'IN_TRANSIT'
            },
            include: { items: true }
        })

        if (!transfer) {
            return NextResponse.json({ error: 'Transfer not found or not ready to receive' }, { status: 404 })
        }

        // Process all items and mark transfer complete in a single transaction
        // to prevent partial receives if the operation fails midway
        const updatedTransfer = await prisma.$transaction(async (tx) => {
            // Process each item
            for (const item of transfer.items) {
                const receivedItem = receivedItems?.find((r: any) => r.id === item.id)
                const receivedQty = receivedItem?.receivedQty ?? item.dispatchedQty ?? item.approvedQty ?? item.requestedQty
                const varianceQty = receivedQty - (item.dispatchedQty || item.approvedQty || item.requestedQty)

                // Update transfer item
                await (tx as any).stockTransferItem.update({
                    where: { id: item.id },
                    data: {
                        receivedQty,
                        varianceQty: varianceQty !== 0 ? varianceQty : null,
                        varianceReason: varianceQty !== 0 ? (receivedItem?.varianceReason || 'Transit variance') : null
                    }
                })

                // Add to POS stock
                await tx.pOSProductStock.upsert({
                    where: {
                        posLocationId_productId: {
                            posLocationId,
                            productId: item.productId
                        }
                    },
                    create: {
                        posLocationId,
                        productId: item.productId,
                        currentStock: receivedQty,
                        lastStockUpdate: new Date()
                    },
                    update: {
                        currentStock: { increment: receivedQty },
                        lastStockUpdate: new Date()
                    }
                })
            }

            // Mark transfer as completed
            return await (tx as any).stockTransferOrder.update({
                where: { id: transferId },
                data: {
                    status: 'COMPLETED',
                    receivedAt: new Date(),
                    receivedById: userId,
                    receiptNotes: notes
                },
                include: {
                    items: {
                        include: {
                            product: { select: { name: true, sku: true, unit: true } }
                        }
                    }
                }
            })
        }, {
            timeout: 30000,
        })

        return NextResponse.json({
            message: 'Transfer received successfully',
            transfer: updatedTransfer
        })
    } catch (error) {
        console.error('Error receiving transfer:', error)
        return NextResponse.json({ error: 'Failed to receive transfer' }, { status: 500 })
    }
}
