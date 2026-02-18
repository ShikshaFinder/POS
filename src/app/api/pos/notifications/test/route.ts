import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id

        const body = await req.json()
        const { title, body: message } = body

        const notification = await createNotification({
            organizationId,
            userId,
            title: title || 'Test Notification',
            body: message || 'This is a test notification generated manually.',
        })

        return NextResponse.json({ success: true, notification })
    } catch (error: any) {
        console.error('Error creating test notification:', error)
        return NextResponse.json(
            { error: 'Failed' },
            { status: 500 }
        )
    }
}
