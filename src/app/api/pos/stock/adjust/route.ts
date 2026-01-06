import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Manually adjust stock (with reason)
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
        const { productId, adjustmentType, quantity, reason } = body

        if (!productId || !adjustmentType || quantity === undefined) {
            return NextResponse.json({
                error: 'productId, adjustmentType (ADD/REMOVE/SET), and quantity are required'
            }, { status: 400 })
        }

        if (!reason) {
            return NextResponse.json({ error: 'Reason is required for stock adjustments' }, { status: 400 })
        }

        // Get current stock
        const currentStock = await prisma.pOSProductStock.findUnique({
            where: {
                posLocationId_productId: {
                    posLocationId,
                    productId
                }
            }
        })

        const oldStock = currentStock?.currentStock || 0
        let newStock: number

        switch (adjustmentType) {
            case 'ADD':
                newStock = oldStock + quantity
                break
            case 'REMOVE':
                newStock = Math.max(0, oldStock - quantity)
                break
            case 'SET':
                newStock = quantity
                break
            default:
                return NextResponse.json({ error: 'Invalid adjustmentType' }, { status: 400 })
        }

        // Update stock
        const updatedStock = await prisma.pOSProductStock.upsert({
            where: {
                posLocationId_productId: {
                    posLocationId,
                    productId
                }
            },
            create: {
                posLocationId,
                productId,
                currentStock: newStock,
                lastStockUpdate: new Date()
            },
            update: {
                currentStock: newStock,
                lastStockUpdate: new Date()
            },
            include: {
                product: {
                    select: { name: true, sku: true, unit: true }
                }
            }
        })

        // Create approval request for significant adjustments (optional)
        const adjustmentAmount = Math.abs(newStock - oldStock)
        if (adjustmentAmount > 10 || newStock === 0) {
            await prisma.approvalQueue.create({
                data: {
                    organizationId,
                    entityType: 'STOCK_ADJUSTMENT',
                    entityId: productId,
                    action: 'ADJUST',
                    requestedById: userId,
                    priority: adjustmentAmount > 50 ? 'HIGH' : 'MEDIUM',
                    status: 'AUTO_APPROVED', // POS adjustments are auto-approved but logged
                    approvedAt: new Date(),
                    requestData: {
                        posLocationId,
                        productId,
                        adjustmentType,
                        oldStock,
                        newStock,
                        reason
                    }
                }
            })
        }

        return NextResponse.json({
            message: 'Stock adjusted successfully',
            adjustment: {
                productId,
                productName: updatedStock.product.name,
                oldStock,
                newStock,
                difference: newStock - oldStock,
                reason
            }
        })
    } catch (error) {
        console.error('Error adjusting stock:', error)
        return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 })
    }
}
