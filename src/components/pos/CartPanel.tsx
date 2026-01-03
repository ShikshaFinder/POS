'use client'

import { Plus, Minus, Trash2, ShoppingCart, Tag, Percent } from 'lucide-react'
import { useState } from 'react'

export interface CartItem {
    id: string
    name: string
    sku: string | null
    unitPrice: number
    markedPrice: number | null
    quantity: number
    unit: string
    discount: number // Line item discount amount
    discountType: 'flat' | 'percent'
    discountValue: number // Original discount input value
    subtotal: number // unitPrice * quantity
    total: number // After line item discount
}

interface CartPanelProps {
    items: CartItem[]
    onUpdateQuantity: (itemId: string, quantity: number) => void
    onRemoveItem: (itemId: string) => void
    onUpdateItemDiscount: (itemId: string, type: 'flat' | 'percent', value: number) => void
    onClearCart: () => void
    // Bill-level discount
    billDiscount: { type: 'flat' | 'percent'; value: number }
    onBillDiscountChange: (type: 'flat' | 'percent', value: number) => void
    // Tax
    taxPercent: number
    // Coupon
    couponCode: string
    onCouponChange: (code: string) => void
    couponApplied: boolean
    couponDiscount: number
    onApplyCoupon: () => void
    onRemoveCoupon: () => void
    // Actions
    onCheckout: () => void
    onHoldBill: () => void
    checkoutLoading: boolean
}

export default function CartPanel({
    items,
    onUpdateQuantity,
    onRemoveItem,
    onUpdateItemDiscount,
    onClearCart,
    billDiscount,
    onBillDiscountChange,
    taxPercent,
    couponCode,
    onCouponChange,
    couponApplied,
    couponDiscount,
    onApplyCoupon,
    onRemoveCoupon,
    onCheckout,
    onHoldBill,
    checkoutLoading
}: CartPanelProps) {
    const [showDiscountInput, setShowDiscountInput] = useState<string | null>(null)

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const lineDiscountTotal = items.reduce((sum, item) => sum + item.discount, 0)

    const billDiscountAmount = billDiscount.type === 'flat'
        ? billDiscount.value
        : (subtotal - lineDiscountTotal) * (billDiscount.value / 100)

    const afterDiscount = subtotal - lineDiscountTotal - billDiscountAmount - couponDiscount
    const taxAmount = afterDiscount * (taxPercent / 100)
    const total = afterDiscount + taxAmount

    return (
        <div className="w-96 bg-white rounded-lg border border-gray-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Cart ({items.length})
                    </h2>
                    {items.length > 0 && (
                        <button
                            onClick={onClearCart}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <ShoppingCart className="h-12 w-12 mb-2" />
                        <p className="text-sm">Cart is empty</p>
                        <p className="text-xs mt-1">Click on products to add</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                                        {item.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        ₹{item.unitPrice.toFixed(2)} × {item.quantity}
                                    </p>
                                    {item.discount > 0 && (
                                        <p className="text-xs text-green-600 mt-0.5">
                                            -{item.discountType === 'flat' ? '₹' : ''}{item.discountValue}{item.discountType === 'percent' ? '%' : ''} discount
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-1">
                                        {item.discount > 0 && (
                                            <span className="text-xs text-gray-400 line-through mr-1">
                                                ₹{item.subtotal.toFixed(2)}
                                            </span>
                                        )}
                                        <span className="text-sm font-semibold text-gray-900">
                                            ₹{item.total.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                            className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-medium">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                            className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => setShowDiscountInput(showDiscountInput === item.id ? null : item.id)}
                                            className="p-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors ml-1"
                                            title="Line discount"
                                        >
                                            <Tag className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => onRemoveItem(item.id)}
                                            className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Line Item Discount Input */}
                            {showDiscountInput === item.id && (
                                <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                                    <select
                                        value={item.discountType}
                                        onChange={(e) => onUpdateItemDiscount(item.id, e.target.value as 'flat' | 'percent', item.discountValue)}
                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                    >
                                        <option value="flat">₹ Flat</option>
                                        <option value="percent">% Percent</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={item.discountValue || ''}
                                        onChange={(e) => onUpdateItemDiscount(item.id, item.discountType, parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 w-16"
                                        min="0"
                                    />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer - Bill Summary */}
            {items.length > 0 && (
                <div className="border-t border-gray-200 p-4 space-y-4">
                    {/* Bill Discount */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-16">Discount</label>
                        <select
                            value={billDiscount.type}
                            onChange={(e) => onBillDiscountChange(e.target.value as 'flat' | 'percent', billDiscount.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1.5"
                        >
                            <option value="flat">₹ Flat</option>
                            <option value="percent">% Percent</option>
                        </select>
                        <input
                            type="number"
                            value={billDiscount.value || ''}
                            onChange={(e) => onBillDiscountChange(billDiscount.type, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
                            min="0"
                        />
                    </div>

                    {/* Coupon */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-16">Coupon</label>
                        {couponApplied ? (
                            <div className="flex-1 flex items-center gap-2">
                                <span className="flex-1 text-xs bg-green-50 text-green-700 px-2 py-1.5 rounded border border-green-200">
                                    {couponCode} (-₹{couponDiscount.toFixed(2)})
                                </span>
                                <button
                                    onClick={onRemoveCoupon}
                                    className="text-xs text-red-600 hover:text-red-700"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => onCouponChange(e.target.value.toUpperCase())}
                                    placeholder="Enter code"
                                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
                                />
                                <button
                                    onClick={onApplyCoupon}
                                    disabled={!couponCode}
                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded disabled:bg-gray-300"
                                >
                                    Apply
                                </button>
                            </>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        {lineDiscountTotal > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Line Discounts</span>
                                <span>-₹{lineDiscountTotal.toFixed(2)}</span>
                            </div>
                        )}
                        {billDiscountAmount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Bill Discount</span>
                                <span>-₹{billDiscountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {couponDiscount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Coupon Discount</span>
                                <span>-₹{couponDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        {taxAmount > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Tax ({taxPercent}%)</span>
                                <span>+₹{taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onHoldBill}
                            className="flex-1 bg-amber-100 text-amber-700 py-3 rounded-lg font-medium hover:bg-amber-200 transition-colors text-sm"
                        >
                            Hold (F5)
                        </button>
                        <button
                            onClick={onCheckout}
                            disabled={checkoutLoading}
                            className="flex-[2] bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {checkoutLoading ? 'Processing...' : 'Pay (F12)'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
