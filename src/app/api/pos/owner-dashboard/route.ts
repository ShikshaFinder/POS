import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET /api/pos/owner-dashboard - Get owner dashboard summary
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
      select: {
        id: true,
        name: true,
        code: true,
        organizationId: true,
        currentBalance: true,
      },
    });

    if (!posLocation) {
      return NextResponse.json({ error: 'No POS location found' }, { status: 404 });
    }

    const organizationId = posLocation.organizationId;
    const posLocationId = posLocation.id;

    // Get stock summary
    const stockStats = await prisma.pOSProductStock.aggregate({
      where: { posLocationId },
      _count: true,
    });

    const lowStockCount = await prisma.pOSProductStock.count({
      where: {
        posLocationId,
        currentStock: { gt: 0 },
        AND: {
          currentStock: { lte: prisma.pOSProductStock.fields.minimumStock },
        },
      },
    });

    const outOfStockCount = await prisma.pOSProductStock.count({
      where: {
        posLocationId,
        currentStock: { lte: 0 },
      },
    });

    // Get orders summary
    const pendingOrders = await prisma.pOSOrder.count({
      where: {
        posLocationId,
        status: { in: ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING'] },
      },
    });

    const shippedOrders = await prisma.pOSOrder.count({
      where: {
        posLocationId,
        status: 'SHIPPED',
      },
    });

    const recentOrders = await prisma.pOSOrder.findMany({
      where: { posLocationId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get invoices summary
    const unpaidInvoices = await prisma.pOSInvoice.aggregate({
      where: {
        posLocationId,
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
      },
      _count: true,
      _sum: { balanceAmount: true },
    });

    const overdueInvoices = await prisma.pOSInvoice.aggregate({
      where: {
        posLocationId,
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
        dueDate: { lt: new Date() },
        balanceAmount: { gt: 0 },
      },
      _count: true,
      _sum: { balanceAmount: true },
    });

    const recentInvoices = await prisma.pOSInvoice.findMany({
      where: { posLocationId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        balanceAmount: true,
        dueDate: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentInvoicesWithOverdue = recentInvoices.map((inv: typeof recentInvoices[0]) => ({
      ...inv,
      isOverdue:
        inv.balanceAmount > 0 &&
        new Date(inv.dueDate) < new Date() &&
        ['SENT', 'PARTIALLY_PAID'].includes(inv.status),
    }));

    // Get stock alerts
    const pendingAlerts = await prisma.pOSStockAlert.count({
      where: {
        posLocationId,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
    });

    const criticalAlerts = await prisma.pOSStockAlert.count({
      where: {
        posLocationId,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
        priority: 'CRITICAL',
      },
    });

    const recentAlerts = await prisma.pOSStockAlert.findMany({
      where: {
        posLocationId,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });

    const recentAlertsFormatted = recentAlerts.map((alert: typeof recentAlerts[0]) => ({
      id: alert.id,
      productName: alert.product.name,
      alertType: alert.alertType,
      priority: alert.priority,
      currentStock: alert.currentStock,
      minimumStock: alert.minimumStock,
      createdAt: alert.createdAt.toISOString(),
    }));

    return NextResponse.json({
      location: {
        id: posLocation.id,
        name: posLocation.name,
        code: posLocation.code,
        currentBalance: posLocation.currentBalance,
      },
      stock: {
        totalProducts: stockStats._count,
        lowStockCount,
        outOfStockCount,
      },
      orders: {
        pending: pendingOrders,
        shipped: shippedOrders,
        recentOrders,
      },
      invoices: {
        unpaidCount: unpaidInvoices._count,
        unpaidAmount: unpaidInvoices._sum.balanceAmount || 0,
        overdueCount: overdueInvoices._count,
        overdueAmount: overdueInvoices._sum.balanceAmount || 0,
        recentInvoices: recentInvoicesWithOverdue,
      },
      alerts: {
        pendingCount: pendingAlerts,
        criticalCount: criticalAlerts,
        recentAlerts: recentAlertsFormatted,
      },
    });
  } catch (error) {
    console.error('Failed to fetch owner dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
