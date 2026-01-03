import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface CheckoutItem {
  productId: string
  quantity: number
  price: number
  discount: number
  discountType: 'flat' | 'percent'
}

interface CheckoutData {
  items: CheckoutItem[]
  customerId?: string
  customerName?: string
  customerPhone?: string
  // Payment details
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'SPLIT'
  amountPaid: number
  changeGiven: number
  cashAmount: number
  cardAmount: number
  upiAmount: number
  walletAmount: number
  // Discounts and taxes
  billDiscount: number
  billDiscountType: 'flat' | 'percent'
  couponCode?: string
  couponDiscount: number
  taxPercent: number
  taxAmount: number
  roundOff: number
  // Totals
  subtotal: number
  totalAmount: number
  // Notes
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    const userId = (session.user as any).id
    const body: CheckoutData = await req.json()

    const {
      items,
      customerId,
      customerName,
      customerPhone,
      paymentMethod = 'CASH',
      amountPaid,
      changeGiven = 0,
      cashAmount = 0,
      cardAmount = 0,
      upiAmount = 0,
      walletAmount = 0,
      billDiscount = 0,
      couponCode,
      couponDiscount = 0,
      taxAmount = 0,
      roundOff = 0,
      subtotal,
      totalAmount,
      notes
    } = body

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

      // Generate receipt number
      const today = new Date()
      const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '')
      const count = await tx.pOSTransaction.count({
        where: {
          organizationId,
          transactionDate: {
            gte: new Date(today.setHours(0, 0, 0, 0)),
            lt: new Date(today.setHours(23, 59, 59, 999))
          }
        }
      })
      const receiptNumber = `RCP-${datePrefix}-${String(count + 1).padStart(4, '0')}`

      // Get or create POS customer
      let posCustomerId = customerId
      if (!posCustomerId && (customerName || customerPhone)) {
        // Try to find existing customer by phone
        let customer = customerPhone
          ? await tx.pOSCustomer.findFirst({
            where: { organizationId, phone: customerPhone }
          })
          : null

        if (!customer) {
          customer = await tx.pOSCustomer.create({
            data: {
              organizationId,
              name: customerName || 'Walk-in Customer',
              phone: customerPhone
            }
          })
        }
        posCustomerId = customer.id
      }

      // Create POS Transaction
      const transaction = await tx.pOSTransaction.create({
        data: {
          organizationId,
          receiptNumber,
          transactionDate: new Date(),
          customerId: posCustomerId,
          customerName: customerName || 'Walk-in Customer',
          customerPhone,
          // Amounts
          subtotal,
          discountAmount: billDiscount + couponDiscount + items.reduce((sum, item) => sum + item.discount, 0),
          taxAmount,
          totalAmount,
          // Note: roundOff amount is included in totalAmount calculation
          // Payment
          paymentMethod,
          amountPaid,
          changeGiven,
          cashAmount: paymentMethod === 'CASH' ? amountPaid : (paymentMethod === 'SPLIT' ? cashAmount : 0),
          cardAmount: paymentMethod === 'CARD' ? totalAmount : (paymentMethod === 'SPLIT' ? cardAmount : 0),
          upiAmount: paymentMethod === 'UPI' ? totalAmount : (paymentMethod === 'SPLIT' ? upiAmount : 0),
          walletAmount: paymentMethod === 'WALLET' ? totalAmount : (paymentMethod === 'SPLIT' ? walletAmount : 0),
          // Status
          status: 'COMPLETED',
          notes,
          cashierId: userId,
          // Create transaction items
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              productName: '', // Will be updated below
              productSku: '',
              quantity: item.quantity,
              unitPrice: item.price,
              discountAmount: item.discount,
              taxAmount: 0, // Per-item tax if needed
              subtotal: item.price * item.quantity,
              total: (item.price * item.quantity) - item.discount
            }))
          }
        },
        include: {
          items: true
        }
      })

      // Update product names in transaction items and deduct stock
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true, sku: true }
        })

        if (product) {
          // Update transaction item with product details
          await tx.pOSTransactionItem.updateMany({
            where: {
              transactionId: transaction.id,
              productId: item.productId
            },
            data: {
              productName: product.name,
              productSku: product.sku || ''
            }
          })
        }

        // Deduct stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: item.quantity
            }
          }
        })

        // Create inventory transaction if stock exists
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
              referenceType: 'POSTransaction',
              referenceId: transaction.id
            }
          })
        }
      }

      // Update POS session totals if there's an active session
      const activeSession = await tx.pOSSession.findFirst({
        where: {
          organizationId,
          cashierId: userId,
          status: 'OPEN'
        }
      })

      if (activeSession) {
        await tx.pOSSession.update({
          where: { id: activeSession.id },
          data: {
            totalSales: { increment: totalAmount },
            totalCash: { increment: cashAmount || (paymentMethod === 'CASH' ? amountPaid : 0) },
            totalCard: { increment: cardAmount || (paymentMethod === 'CARD' ? totalAmount : 0) },
            totalUPI: { increment: upiAmount || (paymentMethod === 'UPI' ? totalAmount : 0) },
            totalWallet: { increment: walletAmount || (paymentMethod === 'WALLET' ? totalAmount : 0) },
            transactionCount: { increment: 1 }
          }
        })
      }

      // Update customer loyalty points if applicable
      if (posCustomerId) {
        const pointsEarned = Math.floor(totalAmount / 100) // 1 point per ₹100
        await tx.pOSCustomer.update({
          where: { id: posCustomerId },
          data: {
            loyaltyPoints: { increment: pointsEarned },
            totalPurchases: { increment: totalAmount },
            totalVisits: { increment: 1 },
            lastVisitDate: new Date()
          }
        })
      }

      return transaction
    })

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      receiptNumber: result.receiptNumber
    })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process checkout' },
      { status: 500 }
    )
  }
}
