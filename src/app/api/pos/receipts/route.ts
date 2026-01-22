import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/receipts - List receipts with pagination
// Uses Invoice model since that's what checkout creates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')
    const receiptId = searchParams.get('id')

    // If specific receipt requested
    if (receiptId) {
      // Validate that receiptId is a valid MongoDB ObjectID (24 hex characters)
      const isValidObjectId = /^[a-f0-9]{24}$/i.test(receiptId)
      if (!isValidObjectId) {
        return NextResponse.json(
          { error: 'Invalid receipt ID format. Please use a valid receipt ID.' },
          { status: 400 }
        )
      }

      const invoice = await prisma.invoice.findFirst({
        where: {
          id: receiptId,
          organizationId
        },
        include: {
          salesOrder: {
            include: {
              items: {
                include: {
                  product: true
                }
              },
              connection: true
            }
          },
          payments: true
        }
      })

      if (!invoice) {
        return NextResponse.json(
          { error: 'Receipt not found' },
          { status: 404 }
        )
      }

      // Transform to receipt format
      const receipt = transformInvoiceToReceipt(invoice)
      return NextResponse.json({ receipt })
    }

    // Build where clause for invoices
    const where: any = {
      organizationId
    }

    if (dateFrom) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: new Date(dateFrom)
      }
    }

    if (dateTo) {
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count
    const total = await prisma.invoice.count({ where })

    // Get invoices with related data
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        salesOrder: {
          include: {
            items: {
              include: {
                product: true
              }
            },
            connection: true
          }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    // Transform invoices to receipt format
    const receipts = invoices.map(transformInvoiceToReceipt)

    return NextResponse.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    )
  }
}

// Transform Invoice to Receipt format for frontend
function transformInvoiceToReceipt(invoice: any) {
  const items = invoice.salesOrder?.items || []
  const payment = invoice.payments?.[0]

  // Parse payment details from referenceNo if stored as JSON
  let paymentMethod = payment?.method || 'CASH'
  let paymentDetails: any = {}

  if (payment?.referenceNo) {
    try {
      paymentDetails = JSON.parse(payment.referenceNo)
    } catch (e) {
      // Not JSON, just a reference number
    }
  }

  // Calculate subtotal from items
  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (item.price * item.qty)
  }, 0)

  // Calculate tax (difference between total and subtotal, if any)
  const taxAmount = Math.max(0, invoice.totalAmount - subtotal)

  return {
    id: invoice.id,
    receiptNumber: invoice.invoiceNumber,
    transactionDate: invoice.createdAt.toISOString(),
    customerName: invoice.customerName || invoice.salesOrder?.connection?.name || 'Walk-in Customer',
    customerPhone: invoice.salesOrder?.connection?.contacts?.[0]?.phone || null,
    items: items.map((item: any) => ({
      id: item.id,
      productName: item.product?.name || 'Unknown Product',
      quantity: item.qty,
      unitPrice: item.price,
      discountAmount: 0,
      total: item.price * item.qty,
      unit: item.product?.unit || 'PIECE'
    })),
    subtotal: subtotal,
    discountAmount: 0,
    taxAmount: taxAmount,
    totalAmount: invoice.totalAmount,
    paymentMethod: paymentMethod,
    amountPaid: invoice.paidAmount,
    changeGiven: Math.max(0, invoice.paidAmount - invoice.totalAmount),
    status: invoice.status,
    cashier: null // Could be added if we track cashier on invoice
  }
}

// POST /api/pos/receipts - Send receipt via email
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId
    const body = await req.json()
    const { receiptId, email } = body

    if (!receiptId || !email) {
      return NextResponse.json(
        { error: 'Receipt ID and email are required' },
        { status: 400 }
      )
    }

    // Get invoice (receipt)
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: receiptId,
        organizationId
      },
      include: {
        salesOrder: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        payments: true,
        organization: {
          select: {
            name: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    // Transform to receipt format
    const receipt = transformInvoiceToReceipt(invoice)

    // Try to send email (if email service is configured)
    try {
      const { sendReceiptEmail } = await import('@/lib/email')
      await sendReceiptEmail(email, {
        receiptNumber: receipt.receiptNumber,
        transactionDate: new Date(receipt.transactionDate),
        customerName: receipt.customerName,
        items: receipt.items,
        subtotal: receipt.subtotal,
        discountAmount: receipt.discountAmount,
        taxAmount: receipt.taxAmount,
        totalAmount: receipt.totalAmount,
        paymentMethod: receipt.paymentMethod,
        amountPaid: receipt.amountPaid,
        changeGiven: receipt.changeGiven,
        organizationName: invoice.organization.name,
      })
    } catch (emailError) {
      console.error('Email service error:', emailError)
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Receipt sent to ${email}`
    })
  } catch (error) {
    console.error('Error sending receipt:', error)
    return NextResponse.json(
      { error: 'Failed to send receipt' },
      { status: 500 }
    )
  }
}
