'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Package,
  ShoppingCart,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  DollarSign,
  RefreshCw,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface POSLocationSummary {
  location: {
    id: string;
    name: string;
    code: string;
    currentBalance: number;
  };
  stock: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  orders: {
    pending: number;
    shipped: number;
    recentOrders: {
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    }[];
  };
  invoices: {
    unpaidCount: number;
    unpaidAmount: number;
    overdueCount: number;
    overdueAmount: number;
    recentInvoices: {
      id: string;
      invoiceNumber: string;
      status: string;
      totalAmount: number;
      balanceAmount: number;
      dueDate: string;
      isOverdue: boolean;
    }[];
  };
  alerts: {
    pendingCount: number;
    criticalCount: number;
    recentAlerts: {
      id: string;
      productName: string;
      alertType: string;
      priority: string;
      currentStock: number;
      minimumStock: number;
      createdAt: string;
    }[];
  };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function OwnerDashboardPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<POSLocationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/owner-dashboard');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No POS Location</h3>
        <p className="text-gray-500 mt-1">You are not assigned to any POS location yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{summary.location.name}</h1>
          <p className="text-gray-500 text-sm">POS Code: {summary.location.code}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Current Balance</p>
              <p className={`text-xl font-bold ${summary.location.currentBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                KES {summary.location.currentBalance.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Pending Orders</p>
              <p className="text-xl font-bold text-blue-600">{summary.orders.pending}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Unpaid Invoices</p>
              <p className="text-xl font-bold text-yellow-600">{summary.invoices.unpaidCount}</p>
            </div>
            <FileText className="h-8 w-8 text-yellow-500" />
          </div>
          {summary.invoices.overdueCount > 0 && (
            <p className="text-xs text-red-600 mt-1">
              {summary.invoices.overdueCount} overdue
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Stock Alerts</p>
              <p className="text-xl font-bold text-red-600">{summary.alerts.pendingCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          {summary.alerts.criticalCount > 0 && (
            <p className="text-xs text-red-600 mt-1">
              {summary.alerts.criticalCount} critical
            </p>
          )}
        </div>
      </div>

      {/* Stock Summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Status
          </h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.stock.totalProducts}</p>
              <p className="text-xs text-gray-500">Total Products</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{summary.stock.lowStockCount}</p>
              <p className="text-xs text-gray-500">Low Stock</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{summary.stock.outOfStockCount}</p>
              <p className="text-xs text-gray-500">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Alerts */}
      {summary.alerts.recentAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Stock Alerts
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {summary.alerts.recentAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{alert.productName}</p>
                  <p className="text-sm text-gray-500">
                    Current: {alert.currentStock} / Min: {alert.minimumStock}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[alert.priority]}`}>
                    {alert.priority}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    alert.alertType === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {alert.alertType.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Recent Orders
          </h2>
          <Link
            href="/pos/orders"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {summary.orders.recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No orders yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {summary.orders.recentOrders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-gray-900">
                    KES {order.totalAmount.toLocaleString()}
                  </p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </h2>
          <Link
            href="/pos/invoices"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {summary.invoices.recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No invoices yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {summary.invoices.recentInvoices.map((invoice) => (
              <div key={invoice.id} className={`p-4 flex items-center justify-between ${invoice.isOverdue ? 'bg-red-50' : ''}`}>
                <div>
                  <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">
                    Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    KES {invoice.totalAmount.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {invoice.balanceAmount > 0 && (
                      <span className="text-xs text-orange-600">
                        Balance: KES {invoice.balanceAmount.toLocaleString()}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[invoice.status]}`}>
                      {invoice.status.replace('_', ' ')}
                    </span>
                    {invoice.isOverdue && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Outstanding Balance Summary */}
        {summary.invoices.unpaidAmount > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Outstanding</span>
              <span className="text-lg font-bold text-orange-600">
                KES {summary.invoices.unpaidAmount.toLocaleString()}
              </span>
            </div>
            {summary.invoices.overdueAmount > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-red-600">Overdue Amount</span>
                <span className="text-sm font-medium text-red-600">
                  KES {summary.invoices.overdueAmount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
