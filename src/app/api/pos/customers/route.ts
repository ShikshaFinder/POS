import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/pos/customers - Get all customers
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search')
    const phone = searchParams.get('phone')

    const where: any = {
      organizationId: (session.user as any).currentOrganizationId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (phone) {
      where.phone = phone
    }

    const customers = await prisma.pOSCustomer.findMany({
      where,
      include: {
        transactions: {
          select: {
            id: true,
            totalAmount: true,
            transactionDate: true,
          },
          orderBy: {
            transactionDate: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        lastVisitDate: 'desc',
      },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/pos/customers - Create new customer
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone, email, address } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if customer with phone already exists
    if (phone) {
      const existing = await prisma.pOSCustomer.findFirst({
        where: {
          organizationId: (session.user as any).currentOrganizationId,
          phone,
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Customer with this phone number already exists' },
          { status: 400 }
        )
      }
    }

    const customer = await prisma.pOSCustomer.create({
      data: {
        organizationId: (session.user as any).currentOrganizationId,
        name,
        phone,
        email,
        address,
      },
    })

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error('Failed to create customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
