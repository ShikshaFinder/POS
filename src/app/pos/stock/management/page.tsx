'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Package,
    Search,
    ShoppingCart,
    History,
    Plus,
    Loader2,
    AlertTriangle,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface ProductStock {
    id: string;
    currentStock: number;
    minimumStock: number;
    reorderQuantity: number;
    product: {
        id: string;
        name: string;
        sku: string | null;
        unit: string;
        category: string;
        unitPrice: number;
    };
}

interface OrderHistoryItem {
    id: string;
    orderRef: string;
    createdAt: string;
    status: string; // PENDING, COMPLETED, etc.
    totalAmount: number;
    items: Array<{
        productName: string;
        quantity: number;
    }>;
}

export default function StockManagementPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'STOCK' | 'HISTORY'>('STOCK');
    const [loading, setLoading] = useState(true);
    const [stockItems, setStockItems] = useState<ProductStock[]>([]);
    const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Cart state for manual ordering

    // Using a Map for productId -> quantity
    // Actually simpler to use array or object in state for React
    const [cartItems, setCartItems] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchStock();
        fetchOrders();
    }, []);

    const fetchStock = async () => {
        try {
            const res = await fetch('/api/pos/stock/local');
            if (res.ok) {
                const data = await res.json();
                setStockItems(data.stock || []);
            }
        } catch (error) {
            console.error('Failed to fetch stock:', error);
            toast.error('Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/pos/orders/history');
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        }
    };

    const updateCart = (productId: string, qty: number) => {
        setCartItems(prev => {
            const next = { ...prev };
            if (qty <= 0) {
                delete next[productId];
            } else {
                next[productId] = qty;
            }
            return next;
        });
    };

    const handleCreateOrder = async () => {
        const items = Object.entries(cartItems).map(([productId, quantity]) => ({
            productId,
            quantity
        }));

        if (items.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        try {
            setLoading(true);
            const res = await fetch('/api/pos/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });

            if (res.ok) {
                toast.success('Order placed successfully!');
                setCartItems({});
                fetchOrders(); // Refresh history
                setActiveTab('HISTORY');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to place order');
            }
        } catch (error) {
            toast.error('Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    const filteredStock = stockItems.filter(item =>
        item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const cartTotalItems = Object.values(cartItems).reduce((a, b) => a + b, 0);

    if (loading && stockItems.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 p-4 gap-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="h-6 w-6 text-blue-600" />
                        Stock Management
                    </h1>
                    <p className="text-sm text-gray-500">Manage inventory and restock from HQ</p>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'STOCK' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('STOCK')}
                        className="gap-2"
                    >
                        <Package className="h-4 w-4" />
                        Stock
                    </Button>
                    <Button
                        variant={activeTab === 'HISTORY' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('HISTORY')}
                        className="gap-2"
                    >
                        <History className="h-4 w-4" />
                        Order History
                    </Button>
                </div>
            </div>

            {activeTab === 'STOCK' ? (
                <div className="flex flex-col lg:flex-row gap-4 h-full">
                    {/* Main List */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredStock.map(item => (
                                    <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 line-clamp-1" title={item.product.name}>
                                                    {item.product.name}
                                                </h3>
                                                <p className="text-xs text-gray-500">{item.product.sku || 'No SKU'}</p>
                                            </div>
                                            <div className={cn(
                                                "px-2 py-1 rounded text-xs font-medium",
                                                item.currentStock <= item.minimumStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                            )}>
                                                {item.currentStock} {item.product.unit}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            <div className="text-sm">
                                                <span className="text-gray-500">Min: </span>
                                                {item.minimumStock}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {cartItems[item.product.id] ? (
                                                    <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-1">
                                                        <button
                                                            onClick={() => updateCart(item.product.id, (cartItems[item.product.id] || 0) - 1)}
                                                            className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50 text-blue-600 font-bold"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-8 text-center font-medium text-blue-700">{cartItems[item.product.id]}</span>
                                                        <button
                                                            onClick={() => updateCart(item.product.id, (cartItems[item.product.id] || 0) + 1)}
                                                            className="w-6 h-6 flex items-center justify-center bg-blue-600 rounded shadow-sm hover:bg-blue-700 text-white font-bold"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" variant="outline" onClick={() => updateCart(item.product.id, item.reorderQuantity || 1)}>
                                                        Restock
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Cart */}
                    {cartTotalItems > 0 && (
                        <div className="w-full lg:w-80 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-blue-50/50">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                                    Restock Order
                                </h3>
                            </div>

                            <div className="flex-1 overflow-auto p-4 space-y-3">
                                {Object.entries(cartItems).map(([productId, qty]) => {
                                    const item = stockItems.find(s => s.product.id === productId);
                                    if (!item) return null;
                                    return (
                                        <div key={productId} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                            <span className="truncate flex-1 pr-2">{item.product.name}</span>
                                            <span className="font-medium">x{qty}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreateOrder} disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                                    Place Order ({cartTotalItems} items)
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* History Tab */
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3">Order Ref</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Items</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{order.orderRef}</td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-xs font-medium",
                                            order.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                                                order.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-gray-100 text-gray-600"
                                        )}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        {order.items.reduce((s, i) => s + i.quantity, 0)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">Coming Soon</td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No past orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
