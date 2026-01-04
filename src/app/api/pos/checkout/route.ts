import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    const body = await req.json()
    const { items, customerName, customerPhone, totalAmount } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check stock availability for all items
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        })

        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }

        if ((product.currentStock ?? 0) < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`)
        }
      }

      // Create invoice/order
      const invoiceNumber = `INV-${Date.now()}`
      
      // For POS, we'll create a sales order and invoice
      // First, create or get walk-in customer connection
      let connection = await tx.connection.findFirst({
        where: {
          organizationId,
          name: customerName || 'Walk-in Customer',
          type: 'CUSTOMER'
        }
      })

      if (!connection && customerName) {
        connection = await tx.connection.create({
          data: {
            organizationId,
            name: customerName,
            type: 'CUSTOMER',
            businessCategory: 'RETAIL',
            contacts: customerPhone ? {
              create: {
                fullName: customerName,
                phone: customerPhone,
                isPrimary: true
              }
            } : undefined
          }
        })
      }

      // Create sales order
      const orderRef = `SO-${Date.now()}`
      
      // Ensure we have a connection (required by schema)
      if (!connection) {
        throw new Error('Customer connection is required')
      }
      
      const salesOrder = await tx.salesOrder.create({
        data: {
          organizationId,
          orderRef,
          connectionId: connection.id,
          stage: 'COMPLETED',
          items: {
            create: items.map((item: any) => ({
              organizationId,
              productId: item.productId,
              qty: item.quantity,
              price: item.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          invoiceNumber,
          salesOrderId: salesOrder.id,
          totalAmount,
          paidAmount: totalAmount,
          status: 'PAID',
          approvalStatus: 'APPROVED',
          customerName: customerName || 'Walk-in Customer'
        }
      })

      // Create payment record
      await tx.payment.create({
        data: {
          organizationId,
          invoiceId: invoice.id,
          amount: totalAmount,
          method: 'CASH',
          paidAt: new Date(),
          status: 'COMPLETED'
        }
      })

      // Update stock levels
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity
            }
          }
        })

        // Create inventory transaction
        const stock = await tx.inventoryStock.findFirst({
          where: {
            organizationId,
            productId: item.productId
          }
        })

        if (stock) {
          await tx.inventoryTransaction.create({
            data: {
              organizationId,
              stockId: stock.id,
              type: 'OUT',
              qty: item.quantity,
              referenceType: 'SalesOrder',
              referenceId: salesOrder.id
            }
          })
        }
      }

      return { salesOrder, invoice }
    })

    return NextResponse.json({
      success: true,
      orderId: result.salesOrder.id,
      invoiceNumber: result.invoice.invoiceNumber
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process checkout' },
      { status: 500 }
    )
  }
}
