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
    const { transactionId, resolution, localData } = await req.json()

    if (!transactionId || !resolution) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate resolution choice
    if (resolution !== 'local' && resolution !== 'server') {
      return NextResponse.json(
        { error: 'Invalid resolution choice' },
        { status: 400 }
      )
    }

    // If keeping server version, just return success
    if (resolution === 'server') {
      return NextResponse.json({
        success: true,
        message: 'Server version kept',
        transactionId
      })
    }

    // If keeping local version, we need to update the invoice
    // The checkout route creates Invoice and SalesOrder, so we work with those
    
    // First try to find invoice by ID
    let invoice = await prisma.invoice.findUnique({
      where: { id: transactionId },
      include: {
        salesOrder: {
          include: {
            items: true
          }
        }
      }
    })

    // If not found by ID, try to find by invoice number (receipt number)
    if (!invoice) {
      invoice = await prisma.invoice.findFirst({
        where: { 
          invoiceNumber: transactionId,
          organizationId 
        },
        include: {
          salesOrder: {
            include: {
              items: true
            }
          }
        }
      })
    }

    if (!invoice) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update invoice with local data
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmount: localData.totalAmount,
        paidAmount: localData.amountPaid || localData.paidAmount,
        customerName: localData.customerName,
        notes: localData.notes,
        updatedAt: new Date()
      }
    })

    // Update payment if exists
    const existingPayment = await prisma.payment.findFirst({
      where: { invoiceId: invoice.id }
    })

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount: localData.amountPaid || localData.paidAmount,
          method: localData.paymentMethod,
          // Store split payment details in referenceNo as JSON if needed
          referenceNo: localData.cashAmount || localData.cardAmount || localData.upiAmount 
            ? JSON.stringify({
                cashAmount: localData.cashAmount,
                cardAmount: localData.cardAmount,
                upiAmount: localData.upiAmount,
                walletAmount: localData.walletAmount
              })
            : existingPayment.referenceNo
        }
      })
    }

    // Update sales order items if provided
    if (localData.items && Array.isArray(localData.items) && invoice.salesOrder) {
      // Delete existing items
      await prisma.orderItem.deleteMany({
        where: { salesOrderId: invoice.salesOrder.id }
      })

      // Get product details for each item
      const productIds = localData.items.map((item: any) => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true, unitPrice: true }
      })

      const productMap = new Map(products.map(p => [p.id, p]))

      // Create new items
      await prisma.orderItem.createMany({
        data: localData.items.map((item: any) => {
          const product = productMap.get(item.productId)
          return {
            organizationId,
            salesOrderId: invoice!.salesOrder!.id,
            productId: item.productId,
            qty: item.quantity || item.qty,
            price: item.price || item.unitPrice || product?.unitPrice || 0
          }
        })
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Local version applied successfully',
      invoice: updatedInvoice
    })

  } catch (error) {
    console.error('Conflict resolution error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    )
  }
}
