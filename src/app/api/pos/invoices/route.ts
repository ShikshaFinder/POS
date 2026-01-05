import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/pos/invoices - Get invoices for POS owner's location
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Find POS location where user is owner
    const posLocation = await prisma.pOSLocation.findFirst({
      where: {
        ownerId: userId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!posLocation) {
      return NextResponse.json({ error: 'No POS location found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = { posLocationId: posLocation.id };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.pOSInvoice.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pOSInvoice.count({ where }),
    ]);

    // Calculate overdue status
    const invoicesWithOverdue = invoices.map((inv: typeof invoices[0]) => ({
      ...inv,
      isOverdue:
        inv.balanceAmount > 0 &&
        new Date(inv.dueDate) < new Date() &&
        ['SENT', 'PARTIALLY_PAID'].includes(inv.status),
      daysOverdue:
        inv.balanceAmount > 0 && new Date(inv.dueDate) < new Date()
          ? Math.floor(
              (new Date().getTime() - new Date(inv.dueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0,
    }));

    // Calculate summary
    const outstandingInvoices = await prisma.pOSInvoice.aggregate({
      where: {
        posLocationId: posLocation.id,
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
      },
      _sum: { balanceAmount: true },
    });

    const overdueInvoices = await prisma.pOSInvoice.aggregate({
      where: {
        posLocationId: posLocation.id,
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
        dueDate: { lt: new Date() },
        balanceAmount: { gt: 0 },
      },
      _count: true,
      _sum: { balanceAmount: true },
    });

    return NextResponse.json({
      invoices: invoicesWithOverdue,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalOutstanding: outstandingInvoices._sum.balanceAmount || 0,
        overdueAmount: overdueInvoices._sum.balanceAmount || 0,
        overdueCount: overdueInvoices._count,
      },
    });
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
