import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendReceiptEmail } from '@/lib/email'

// GET /api/pos/receipts - List receipts with pagination
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
      const receipt = await prisma.pOSTransaction.findFirst({
        where: {
          id: receiptId,
          organizationId
        },
        include: {
          items: true,
          customer: true,
          cashier: {
            select: {
              profile: {
                select: { fullName: true }
              }
            }
          }
        }
      })

      if (!receipt) {
        return NextResponse.json(
          { error: 'Receipt not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ receipt })
    }

    // Build where clause
    const where: any = {
      organizationId,
      status: 'COMPLETED'
    }

    if (dateFrom) {
      where.transactionDate = {
        ...(where.transactionDate || {}),
        gte: new Date(dateFrom)
      }
    }

    if (dateTo) {
      where.transactionDate = {
        ...(where.transactionDate || {}),
        lte: new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } }
      ]
    }

    // Get total count
    const total = await prisma.pOSTransaction.count({ where })

    // Get receipts
    const receipts = await prisma.pOSTransaction.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            discountAmount: true,
            total: true
          }
        },
        cashier: {
          select: {
            profile: {
              select: { fullName: true }
            }
          }
        }
      },
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

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

    // Get receipt
    const receipt = await prisma.pOSTransaction.findFirst({
      where: {
        id: receiptId,
        organizationId
      },
      include: {
        items: true,
        organization: {
          select: {
            name: true
          }
        }
      }
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      )
    }

    // Calculate subtotal from items
    const subtotal = receipt.items.reduce((sum, item) => sum + item.total + (item.discountAmount || 0), 0)

    // Send the receipt email
    await sendReceiptEmail(email, {
      receiptNumber: receipt.receiptNumber,
      transactionDate: receipt.transactionDate,
      customerName: receipt.customerName || undefined,
      items: receipt.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount || 0,
        total: item.total,
      })),
      subtotal,
      discountAmount: receipt.discountAmount || 0,
      taxAmount: receipt.taxAmount || 0,
      totalAmount: receipt.totalAmount,
      paymentMethod: receipt.paymentMethod,
      amountPaid: receipt.amountPaid,
      changeGiven: receipt.changeGiven || 0,
      organizationName: receipt.organization.name,
    })

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
