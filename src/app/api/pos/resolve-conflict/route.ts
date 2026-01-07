import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId, resolution, localData, serverData } = await req.json()

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

    // If keeping local version, update the transaction
    const transaction = await prisma.pOSTransaction.findUnique({
      where: { id: transactionId }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update transaction with local data
    const updated = await prisma.pOSTransaction.update({
      where: { id: transactionId },
      data: {
        customerName: localData.customerName,
        customerPhone: localData.customerPhone,
        paymentMethod: localData.paymentMethod,
        amountPaid: localData.amountPaid,
        paidAmount: localData.amountPaid,
        changeGiven: localData.changeGiven,
        changeAmount: localData.changeGiven,
        cashAmount: localData.cashAmount,
        cardAmount: localData.cardAmount,
        upiAmount: localData.upiAmount,
        walletAmount: localData.walletAmount,
        discountAmount: localData.billDiscount || 0,
        discountPercent: localData.billDiscountType === 'percent' ? (localData.billDiscount || 0) : 0,
        taxPercent: localData.taxPercent,
        taxAmount: localData.taxAmount,
        subtotal: localData.subtotal,
        totalAmount: localData.totalAmount,
        notes: localData.notes,
        updatedAt: new Date()
      }
    })

    // Update transaction items if provided
    if (localData.items && Array.isArray(localData.items)) {
      // Delete existing items
      await prisma.pOSTransactionItem.deleteMany({
        where: { transactionId }
      })

      // Get product details for each item
      const productIds = localData.items.map((item: any) => item.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true }
      })

      const productMap = new Map(products.map(p => [p.id, p]))

      // Create new items with required fields
      await prisma.pOSTransactionItem.createMany({
        data: localData.items.map((item: any) => {
          const product = productMap.get(item.productId)
          const unitPrice = item.price || 0
          const quantity = item.quantity || 0
          const discountAmount = item.discount || 0
          const taxRate = localData.taxPercent || 0
          const total = (unitPrice * quantity) - discountAmount + ((unitPrice * quantity - discountAmount) * taxRate / 100)

          return {
            transactionId,
            productId: item.productId,
            productName: product?.name || 'Unknown Product',
            productSku: product?.sku || null,
            quantity,
            unitPrice,
            discountAmount,
            taxRate,
            total
          }
        })
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Local version applied successfully',
      transaction: updated
    })

  } catch (error) {
    console.error('Conflict resolution error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    )
  }
}
