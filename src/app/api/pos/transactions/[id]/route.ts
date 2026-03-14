import { authenticateRequest } from '@/lib/auth-mobile'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/pos/transactions/[id] - Delete (void) a transaction and restore stock
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = user.currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const { id } = await params

    const transaction = await prisma.pOSTransaction.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          select: { productId: true, quantity: true },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Restore stock for each item
    for (const item of transaction.items) {
      await prisma.product.updateMany({
        where: { id: item.productId, organizationId },
        data: { currentStock: { increment: item.quantity } },
      })
    }

    await prisma.pOSTransaction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}

// GET /api/pos/transactions/[id] - Get a single transaction
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = user.currentOrganizationId
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 })
    }

    const { id } = await params

    const transaction = await prisma.pOSTransaction.findFirst({
      where: { id, organizationId },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 })
  }
}
