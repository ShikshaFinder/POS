import { authenticateRequest } from '@/lib/auth-mobile'
import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
    try {
        const user = await authenticateRequest(req)
    if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = user.currentOrganizationId
        const userId = user.id

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
