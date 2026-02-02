import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/transactions - Get all transactions with filters
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.currentOrganizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const searchParams = req.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      organizationId: session.user.currentOrganizationId,
    }

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (status) {
      where.status = status
    }

    if (customerId) {
      where.customerId = customerId
    }

    const transactions = await prisma.pOSTransaction.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
        cashier: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
      take: limit,
    })

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

// POST /api/pos/transactions - Create new transaction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!session.user.currentOrganizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const body = await req.json()
    const {
      items,
      customerId,
      customerName,
      customerPhone,
      paymentMethod,
      amountPaid,
      discountAmount = 0,
      discountPercent,
      taxPercent = 0,
      notes,
      cashAmount,
      cardAmount,
      upiAmount,
      walletAmount,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Transaction must have at least one item' },
        { status: 400 }
      )
    }

    // Calculate subtotal
    let subtotal = 0
    const processedItems: {
      productId: string
      productName: string
      productSku: string | null
      quantity: number
      unitPrice: number
      discountAmount: number
      taxRate: number
      total: number
    }[] = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        )
      }

      if (!product.unitPrice) {
        return NextResponse.json(
          { error: `Product ${product.name} has no price set` },
          { status: 400 }
        )
      }

      // Check stock availability
      if ((product.currentStock || 0) < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        )
      }

      const itemSubtotal = product.unitPrice * item.quantity
      const itemDiscount = item.discountAmount || 0
      const itemTax = ((itemSubtotal - itemDiscount) * taxPercent) / 100
      const itemTotal = itemSubtotal - itemDiscount + itemTax

      processedItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: product.unitPrice,
        discountAmount: itemDiscount,
        taxRate: taxPercent,
        total: itemTotal,
      })

      subtotal += itemSubtotal
    }

    // Calculate totals
    const finalDiscountAmount = discountPercent
      ? (subtotal * discountPercent) / 100
      : discountAmount
    const afterDiscount = subtotal - finalDiscountAmount
    const taxAmount = (afterDiscount * taxPercent) / 100
    const totalAmount = afterDiscount + taxAmount
    const changeGiven = amountPaid - totalAmount

    if (changeGiven < 0) {
      return NextResponse.json(
        { error: 'Insufficient payment amount' },
        { status: 400 }
      )
    }

    // Generate receipt number
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    const count = await prisma.pOSTransaction.count({
      where: {
        organizationId: session.user.currentOrganizationId,
        transactionDate: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lte: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    })
    const receiptNumber = `POS-${dateStr}-${String(count + 1).padStart(4, '0')}`

    // Create transaction with increased timeout for large orders
    // and parallel stock updates for better performance
    const transaction = await prisma.$transaction(
      async (tx) => {
        // Create transaction
        const newTransaction = await tx.pOSTransaction.create({
          data: {
            organizationId: session.user!.currentOrganizationId!,
            receiptNumber,
            customerId,
            customerName,
            customerPhone,
            subtotal,
            discountAmount: finalDiscountAmount,
            discountPercent,
            taxAmount,
            taxPercent,
            totalAmount,
            paymentMethod,
            amountPaid,
            changeGiven,
            cashAmount,
            cardAmount,
            upiAmount,
            walletAmount,
            notes,
            cashierId: session.user!.id,
            items: {
              create: processedItems,
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customer: true,
          },
        })

        // Update product stock in parallel for better performance
        const stockUpdates = processedItems.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: {
                decrement: item.quantity,
              },
            },
          })
        )

        // Update customer stats if customer exists
        const customerUpdate = customerId
          ? tx.pOSCustomer.update({
              where: { id: customerId },
              data: {
                totalSpent: {
                  increment: totalAmount,
                },
                visitCount: {
                  increment: 1,
                },
                lastVisitDate: new Date(),
              },
            })
          : null

        // Execute all updates in parallel
        await Promise.all([...stockUpdates, customerUpdate].filter(Boolean))

        return newTransaction
      },
      {
        timeout: 15000, // 15 seconds for large transactions
      }
    )

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Failed to create transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
