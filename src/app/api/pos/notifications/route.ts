import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id

        console.log('[Notifications API] Fetching for org:', organizationId, 'user:', userId);
        if (!organizationId || !userId) {
            return NextResponse.json({ error: 'Missing user context' }, { status: 400 })
        }

        const { searchParams } = new URL(req.url)
        const unreadOnly = searchParams.get('unreadOnly') === 'true'
        const limit = parseInt(searchParams.get('limit') || '50')

        let notifications = []

        if ((prisma as any).notification) {
            console.log('[Notifications API] Using Prisma to fetch');
            notifications = await (prisma as any).notification.findMany({
                where: {
                    organizationId,
                    userId,
                    ...(unreadOnly ? { isRead: false } : {})
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit
            })
        } else {
            // Fallback to native MongoDB
            console.log('[Notifications API] Prisma missing model, using MongoDB fallback');
            const { MongoClient, ObjectId } = await import('mongodb')
            if (!process.env.DATABASE_URL) {
                console.error('[Notifications API] DATABASE_URL missing!');
                throw new Error('DATABASE_URL missing');
            }
            const client = new MongoClient(process.env.DATABASE_URL)
            await client.connect()
            const db = client.db()
            const query = {
                organizationId: new ObjectId(organizationId),
                userId: new ObjectId(userId),
                ...(unreadOnly ? { isRead: false } : {})
            };
            console.log('[Notifications API] Mongo query:', JSON.stringify(query));

            notifications = await db.collection('Notification')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray()

            console.log('[Notifications API] Found:', notifications.length, 'records');

            // Transform Mongo _id to id
            notifications = notifications.map((n: any) => ({
                ...n,
                id: n._id.toString(),
                _id: undefined
            }))

            await client.close()
        }

        return NextResponse.json({ notifications })
    } catch (error: any) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json(
            { error: 'Failed to fetch notifications', details: error.message },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { id, allRead } = body
        const organizationId = (session.user as any).currentOrganizationId
        const userId = (session.user as any).id

        if (allRead) {
            if ((prisma as any).notification) {
                await (prisma as any).notification.updateMany({
                    where: {
                        organizationId,
                        userId,
                        isRead: false
                    },
                    data: {
                        isRead: true
                    }
                })
            } else {
                const { MongoClient, ObjectId } = await import('mongodb')
                const client = new MongoClient(process.env.DATABASE_URL!)
                await client.connect()
                await client.db().collection('Notification').updateMany(
                    { organizationId: new ObjectId(organizationId), userId: new ObjectId(userId), isRead: false },
                    { $set: { isRead: true } }
                )
                await client.close()
            }
            return NextResponse.json({ success: true })
        }

        if (!id) {
            return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
        }

        if ((prisma as any).notification) {
            const notification = await (prisma as any).notification.update({
                where: {
                    id,
                    organizationId,
                    userId
                },
                data: {
                    isRead: true
                }
            })
            return NextResponse.json({ notification })
        } else {
            const { MongoClient, ObjectId } = await import('mongodb')
            const client = new MongoClient(process.env.DATABASE_URL!)
            await client.connect()
            const result = await client.db().collection('Notification').findOneAndUpdate(
                { _id: new ObjectId(id), organizationId: new ObjectId(organizationId), userId: new ObjectId(userId) },
                { $set: { isRead: true } },
                { returnDocument: 'after' }
            )
            await client.close()
            return NextResponse.json({ notification: { ...result, id: result?._id.toString() } })
        }
    } catch (error: any) {
        console.error('Error updating notification:', error)
        return NextResponse.json(
            { error: 'Failed to update notification', details: error.message },
            { status: 500 }
        )
    }
}
