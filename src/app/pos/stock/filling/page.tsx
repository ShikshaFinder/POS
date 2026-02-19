
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    Package,
    Search,
    ShoppingCart,
    Loader2,
    ArrowRight,
    Plus,
    Minus,
    History,
    CreditCard,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

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

interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product: {
        name: string;
        unit: string;
    };
}

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    items: OrderItem[];
    invoice?: {
        id: string;
        invoiceNumber: string;
        status: string;
        totalAmount: number;
        balanceAmount: number;
        dueDate: string;
    };
}

export default function FillingStockPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [stockItems, setStockItems] = useState<ProductStock[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [cartItems, setCartItems] = useState<Record<string, number>>({});
    const [placingOrder, setPlacingOrder] = useState(false);
    const [activeTab, setActiveTab] = useState('order');

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        fetchStock();
        fetchOrders(); // Fetch orders initially too
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
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/pos/orders');
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
            setPlacingOrder(true);
            const res = await fetch('/api/pos/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items }),
            });

            if (res.ok) {
                toast.success('Order placed successfully! Check History tab for status.');
                setCartItems({});
                fetchOrders(); // Refresh history
                setActiveTab('history'); // Switch to history tab
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to place order');
            }
        } catch (error) {
            toast.error('Failed to place order');
        } finally {
            setPlacingOrder(false);
        }
    };

    const openPaymentModal = (order: Order) => {
        if (!order.invoice) return;
        setSelectedOrder(order);
        setPaymentAmount(order.invoice.balanceAmount.toString());
        setPaymentMethod('BANK_TRANSFER');
        setPaymentModalOpen(true);
    };

    const handlePayment = async () => {
        if (!selectedOrder?.invoice || !paymentAmount || !paymentMethod) return;

        try {
            setProcessingPayment(true);
            const res = await fetch('/api/pos/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: selectedOrder.invoice.id,
                    amount: parseFloat(paymentAmount),
                    paymentMethod,
                    notes: 'Payment from POS Filling Stock'
                }),
            });

            if (res.ok) {
                toast.success('Payment recorded successfully');
                setPaymentModalOpen(false);
                fetchOrders(); // Refresh order status
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to record payment');
            }
        } catch (error) {
            toast.error('Failed to record payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    const filteredStock = stockItems.filter(item =>
        item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const cartTotalItems = Object.values(cartItems).reduce((a, b) => a + b, 0);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DELIVERED': return 'bg-green-100 text-green-700';
            case 'SHIPPED': return 'bg-blue-100 text-blue-700';
            case 'CONFIRMED': return 'bg-indigo-100 text-indigo-700';
            case 'PENDING': return 'bg-yellow-100 text-yellow-700';
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
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
                        <ShoppingCart className="h-6 w-6 text-blue-600" />
                        Filling Stock
                    </h1>
                    <p className="text-sm text-gray-500">Order products and raw materials from HQ</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-4">
                    <TabsTrigger value="order" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-2">
                        Order Stock
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-2">
                        Order History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="order" className="flex-1 mt-0">
                    <div className="flex flex-col lg:flex-row gap-4 h-full">
                        {/* Main List */}
                        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col">
                            <div className="p-4 border-b border-gray-100 flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search products & materials..."
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
                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 mt-1 inline-block">
                                                        {item.product.category}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "px-2 py-1 rounded text-xs font-medium",
                                                    item.currentStock <= item.minimumStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                                )}>
                                                    Current: {item.currentStock} {item.product.unit}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-4 bg-gray-50 p-2 rounded-lg">
                                                <div className="text-sm font-medium text-gray-600">
                                                    Order Qty:
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {cartItems[item.product.id] ? (
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => updateCart(item.product.id, (cartItems[item.product.id] || 0) - 1)}
                                                                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </button>
                                                            <span className="w-8 text-center font-bold text-gray-900">{cartItems[item.product.id]}</span>
                                                            <button
                                                                onClick={() => updateCart(item.product.id, (cartItems[item.product.id] || 0) + 1)}
                                                                className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded-lg hover:bg-blue-700 text-white"
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <Button size="sm" variant="outline" onClick={() => updateCart(item.product.id, item.reorderQuantity || 1)}>
                                                            Add to Order
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
                            <div className="w-full lg:w-80 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-140px)] sticky top-4">
                                <div className="p-4 border-b border-gray-100 bg-blue-50/50 rounded-t-lg">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                                        Review Order
                                    </h3>
                                </div>

                                <div className="flex-1 overflow-auto p-4 space-y-3">
                                    {Object.entries(cartItems).map(([productId, qty]) => {
                                        const item = stockItems.find(s => s.product.id === productId);
                                        if (!item) return null;
                                        return (
                                            <div key={productId} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="truncate font-medium text-gray-900">{item.product.name}</p>
                                                    <p className="text-xs text-gray-500">{qty} {item.product.unit}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateCart(productId, qty - 1)}
                                                        className="text-gray-400 hover:text-red-500 p-1"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="font-medium w-6 text-center">{qty}</span>
                                                    <button
                                                        onClick={() => updateCart(productId, qty + 1)}
                                                        className="text-gray-400 hover:text-blue-500 p-1"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreateOrder} disabled={placingOrder}>
                                        {placingOrder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                                        Place Order ({cartTotalItems} items)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="flex-1 mt-0">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <History className="h-5 w-5 text-gray-500" />
                                Order History
                            </h3>
                            <Button variant="outline" size="sm" onClick={fetchOrders}>
                                Refresh
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto p-0">
                            {orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                                    <Package className="h-12 w-12 mb-2 text-gray-300" />
                                    <p>No orders found</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Order #</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Items</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Payment</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">{order.orderNumber}</td>
                                                <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {order.items.length} items
                                                    <div className="text-xs text-gray-400 truncate max-w-[200px]">
                                                        {order.items.map(i => i.product.name).join(', ')}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">₹{order.totalAmount.toFixed(2)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(order.status))}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {order.invoice ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded text-xs inline-block w-fit",
                                                                order.invoice.status === 'PAID' ? "bg-green-100 text-green-700" :
                                                                    order.invoice.status === 'PARTIAL' ? "bg-yellow-100 text-yellow-700" :
                                                                        "bg-red-100 text-red-700"
                                                            )}>
                                                                {order.invoice.status}
                                                            </span>
                                                            {order.invoice.balanceAmount > 0 && (
                                                                <span className="text-xs text-red-600 font-medium">
                                                                    Due: ₹{order.invoice.balanceAmount.toFixed(2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 opacity-0">No Invoice</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {order.invoice && order.invoice.balanceAmount > 0 && (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                                            onClick={() => openPaymentModal(order)}
                                                        >
                                                            <CreditCard className="h-3 w-3" />
                                                            Pay
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Payment Modal */}
            <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Make Payment</DialogTitle>
                        <DialogDescription>
                            Record payment for Invoice #{selectedOrder?.invoice?.invoiceNumber}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount Due</label>
                            <div className="text-2xl font-bold text-gray-900">
                                ₹{selectedOrder?.invoice?.balanceAmount.toFixed(2)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Amount</label>
                            <Input
                                type="number"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter amount"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Payment Method</label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
                        <Button onClick={handlePayment} disabled={processingPayment || !paymentAmount}>
                            {processingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
