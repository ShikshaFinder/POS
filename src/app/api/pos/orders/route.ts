
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { ownedPOSLocations: { take: 1 } }
    });

    if (!user?.ownedPOSLocations?.[0]) {
      return NextResponse.json({ error: 'No POS location assigned' }, { status: 404 });
    }

    const posLocationId = user.ownedPOSLocations[0].id;
    // We trust the session organization ID, but if user reports visibility issues,
    // we might need to debug if this matches CRM.
    const organizationId = (session.user as any).currentOrganizationId;

    const orders = await prisma.pOSOrder.findMany({
      where: {
        posLocationId,
        organizationId
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, unit: true }
            }
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            balanceAmount: true,
            dueDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ orders });

  } catch (error) {
    console.error('Error fetching POS orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
