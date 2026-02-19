
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get pending stock transfers and shipped orders for this POS to receive
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
        const organizationId = (session.user as any).currentOrganizationId;

        // 1. Fetch StockTransferOrders (existing logic)
        const transfers = await prisma.stockTransferOrder.findMany({
            where: {
                toPosId: posLocationId,
                status: 'IN_TRANSIT'
            },
            include: {
                fromPos: { select: { name: true, code: true } },
                fromStorage: { select: { name: true } },
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

        // 2. Fetch SHIPPED POSOrders
        // These are orders created by POS, processed by CRM, and marked as Shipped.
        // POS needs to "Receive" them to add to stock.
        const shippedOrders = await prisma.pOSOrder.findMany({
            where: {
                posLocationId: posLocationId,
                status: 'SHIPPED'
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, unit: true, category: true } }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Map POSOrders to Transfer interface for UI consistency
        const orderTransfers = shippedOrders.map(order => ({
            id: order.id,
            transferNumber: order.orderNumber,
            status: 'ARRIVED', // UI status to indicate ready to receive
            fromPos: null,
            fromStorage: { name: 'HQ Supply (Order)' },
            dispatchedAt: order.updatedAt,
            items: order.items.map(item => ({
                id: item.id,
                product: {
                    id: item.productId,
                    name: item.product.name,
                    sku: item.product.sku || '',
                    unit: item.product.unit,
                    category: item.product.category
                },
                requestedQty: item.quantity,
                approvedQty: item.quantity,
                dispatchedQty: item.quantity,
                receivedQty: null
            })),
            isPOSOrder: true // flag to distinguish type
        }));

        return NextResponse.json({ transfers: [...transfers, ...orderTransfers] })
    } catch (error) {
        console.error('Error fetching transfers:', error)
        return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
    }
}

// POST - Receive a stock transfer or POS order
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

        const posLocationId = user.ownedPOSLocations[0].id
        const body = await req.json()
        const { transferId, receivedItems, notes } = body

        if (!transferId) return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 })

        // Check types
        // 1. StockTransferOrder
        const transfer = await prisma.stockTransferOrder.findUnique({
            where: { id: transferId },
            include: { items: true }
        })

        if (transfer) {
            // ... Existing logic for StockTransferOrder ...
            for (const item of transfer.items) {
                const receivedItem = receivedItems?.find((r: any) => r.id === item.id)
                const receivedQty = receivedItem?.receivedQty ?? item.dispatchedQty ?? item.approvedQty ?? item.requestedQty
                const varianceQty = receivedQty - (item.dispatchedQty || item.approvedQty || item.requestedQty)

                await prisma.stockTransferItem.update({
                    where: { id: item.id },
                    data: {
                        receivedQty,
                        varianceQty: varianceQty !== 0 ? varianceQty : null,
                        varianceReason: varianceQty !== 0 ? (receivedItem?.varianceReason || 'Transit variance') : null
                    }
                })

                await prisma.pOSProductStock.upsert({
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

            const updatedTransfer = await prisma.stockTransferOrder.update({
                where: { id: transferId },
                data: {
                    status: 'COMPLETED',
                    receivedAt: new Date(),
                    receivedById: userId,
                    receiptNotes: notes
                },
                include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } }
            })
            return NextResponse.json({ message: 'Transfer received', transfer: updatedTransfer })
        }

        // 2. POSOrder
        const posOrder = await prisma.pOSOrder.findUnique({
            where: { id: transferId },
            include: { items: true }
        })

        if (posOrder) {
            // Verify status to prevent double receiving
            if (posOrder.status === 'DELIVERED') {
                return NextResponse.json({ error: 'Order already received' }, { status: 400 })
            }

            for (const item of posOrder.items) {
                const receivedItem = receivedItems?.find((r: any) => r.id === item.id)
                const receivedQty = receivedItem?.receivedQty ?? item.quantity

                // Update POS Stock
                await prisma.pOSProductStock.upsert({
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

            // Update POSOrder status to DELIVERED
            const updatedOrder = await prisma.pOSOrder.update({
                where: { id: transferId },
                data: {
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                    deliveryNotes: notes ? (posOrder.deliveryNotes ? posOrder.deliveryNotes + '\n' + notes : notes) : posOrder.deliveryNotes
                }
            })

            return NextResponse.json({ message: 'Order received and stock updated', transfer: { ...updatedOrder, status: 'DELIVERED' } })
        }

        return NextResponse.json({ error: 'Transfer/Order not found' }, { status: 404 })

    } catch (error) {
        console.error('Error receiving transfer:', error)
        return NextResponse.json({ error: 'Failed to receive transfer' }, { status: 500 })
    }
}
