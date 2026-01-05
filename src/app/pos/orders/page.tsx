'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface OrderItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  expectedDelivery: string | null;
  deliveredAt: string | null;
  notes: string | null;
  invoice: { id: string; invoiceNumber: string } | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  DRAFT: Clock,
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED: Clock,
};

export default function POSOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/pos/owner-dashboard"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            My Orders
          </h1>
          <p className="text-gray-500 text-sm">Orders from the CRM to your POS location</p>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Orders Yet</h3>
          <p className="text-gray-500 mt-1">Orders will appear here when created by the CRM</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const StatusIcon = statusIcons[order.status] || Clock;
            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(order.createdAt), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-gray-900">
                        KES {order.totalAmount.toLocaleString()}
                      </p>
                      <span className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${statusColors[order.status]}`}>
                        <StatusIcon className="h-4 w-4" />
                        {order.status}
                      </span>
                    </div>
                  </div>
                  {order.expectedDelivery && (
                    <p className="text-sm text-blue-600 mt-2">
                      Expected Delivery: {format(new Date(order.expectedDelivery), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>

                {/* Expanded Order Details */}
                {selectedOrder?.id === order.id && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Order Items</h4>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 bg-white rounded-lg px-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.product.name}</p>
                            <p className="text-xs text-gray-500">{item.product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              {item.quantity} {item.product.unit} × KES {item.unitPrice.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              KES {item.totalPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900">KES {order.subtotal.toLocaleString()}</span>
                        </div>
                        {order.discountAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Discount</span>
                            <span className="text-green-600">-KES {order.discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {order.taxAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tax</span>
                            <span className="text-gray-900">KES {order.taxAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-medium pt-2 border-t border-gray-200">
                          <span className="text-gray-900">Total</span>
                          <span className="text-gray-900">KES {order.totalAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {order.invoice && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Link
                          href={`/pos/invoices?id=${order.invoice.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Invoice: {order.invoice.invoiceNumber}
                        </Link>
                      </div>
                    )}

                    {order.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">{order.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
