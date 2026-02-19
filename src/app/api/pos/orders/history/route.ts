import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id as string;

        // Find Connection
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { connection: true }
        });

        let connectionId = user?.connection?.id;
        if (!connectionId) {
            const connection = await prisma.connection.findFirst({
                where: { users: { some: { id: userId } } }
            });
            if (connection) connectionId = connection.id;
        }

        if (!connectionId) {
            return NextResponse.json({ orders: [] });
        }

        const orders = await prisma.salesOrder.findMany({
            where: {
                connectionId: connectionId,
                source: 'POS'
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderRef: order.orderRef,
            createdAt: order.createdAt,
            status: order.stage || 'PENDING',
            totalAmount: 0, // Calculate if needed, but SalesOrder structure is complex regarding totals
            items: order.items.map(item => ({
                productName: item.product.name,
                quantity: item.qty
            }))
        }));

        return NextResponse.json({ orders: formattedOrders });

    } catch (error) {
        console.error('Error fetching POS orders:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
