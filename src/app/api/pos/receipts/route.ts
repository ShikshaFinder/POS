import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = (session.user as any).currentOrganizationId

    const receipts = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: 'PAID'
      },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        totalAmount: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json({ receipts })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    )
  }
}
