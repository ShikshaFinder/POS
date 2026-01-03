import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// In-memory store for held bills (in production, use Redis or database)
// For now, we'll use a simple Map keyed by organizationId + cashierId
const heldBillsStore = new Map<string, any[]>()

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id
        const key = `${organizationId}:${userId}`

        const bills = heldBillsStore.get(key) || []

        return NextResponse.json({ heldBills: bills })
    } catch (error) {
        console.error('Error fetching held bills:', error)
        return NextResponse.json(
            { error: 'Failed to fetch held bills' },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id
        const key = `${organizationId}:${userId}`
        const body = await req.json()

        const { items, customerName, customerPhone, total, billDiscount, billDiscountType, couponCode } = body

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
        }

        const newBill = {
            id: `held_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            items,
            customerName,
            customerPhone,
            total,
            billDiscount,
            billDiscountType,
            couponCode
        }

        const existing = heldBillsStore.get(key) || []
        existing.push(newBill)
        heldBillsStore.set(key, existing)

        return NextResponse.json({
            success: true,
            bill: newBill,
            totalHeld: existing.length
        })
    } catch (error: any) {
        console.error('Error holding bill:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to hold bill' },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id
        const key = `${organizationId}:${userId}`

        const { searchParams } = new URL(req.url)
        const billId = searchParams.get('id')

        if (!billId) {
            return NextResponse.json({ error: 'Bill ID required' }, { status: 400 })
        }

        const existing = heldBillsStore.get(key) || []
        const filtered = existing.filter(bill => bill.id !== billId)
        heldBillsStore.set(key, filtered)

        return NextResponse.json({
            success: true,
            totalHeld: filtered.length
        })
    } catch (error: any) {
        console.error('Error deleting held bill:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete held bill' },
            { status: 500 }
        )
    }
}
