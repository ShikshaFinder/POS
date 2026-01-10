'use client'

import { Plus, Minus, Trash2, ShoppingCart, Tag, Percent, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

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
    // Mobile support
    isOpen?: boolean
    onClose?: () => void
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
    checkoutLoading,
    isOpen = true,
    onClose
}: CartPanelProps) {
    const [showDiscountInput, setShowDiscountInput] = useState<string | null>(null)
    const [isMobile, setIsMobile] = useState(false)
    const [swipeItemId, setSwipeItemId] = useState<string | null>(null)
    const [swipeDistance, setSwipeDistance] = useState(0)
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)
    const drawerRef = useRef<HTMLDivElement>(null)
    const drawerStartY = useRef(0)

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Swipe to delete cart item
    const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
        if (!isMobile) return
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
        setSwipeItemId(itemId)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isMobile || !swipeItemId) return
        const currentX = e.touches[0].clientX
        const currentY = e.touches[0].clientY
        const deltaX = touchStartX.current - currentX
        const deltaY = Math.abs(touchStartY.current - currentY)
        
        // Only swipe horizontally if vertical movement is minimal
        if (deltaY < 30 && deltaX > 0) {
            setSwipeDistance(Math.min(deltaX, 100))
        }
    }

    const handleTouchEnd = () => {
        if (!isMobile || !swipeItemId) return
        
        // If swiped more than 60px, delete item
        if (swipeDistance > 60) {
            onRemoveItem(swipeItemId)
        }
        
        setSwipeItemId(null)
        setSwipeDistance(0)
    }

    // Swipe to close drawer on mobile
    const handleDrawerTouchStart = (e: React.TouchEvent) => {
        if (!isMobile || !drawerRef.current) return
        drawerStartY.current = e.touches[0].clientY
    }

    const handleDrawerTouchMove = (e: React.TouchEvent) => {
        if (!isMobile || !drawerRef.current) return
        const currentY = e.touches[0].clientY
        const deltaY = currentY - drawerStartY.current
        
        // Only allow downward swipe
        if (deltaY > 0) {
            drawerRef.current.style.transform = `translateY(${deltaY}px)`
        }
    }

    const handleDrawerTouchEnd = (e: React.TouchEvent) => {
        if (!isMobile || !drawerRef.current || !onClose) return
        const currentY = e.changedTouches[0].clientY
        const deltaY = currentY - drawerStartY.current
        
        // If swiped down more than 100px, close drawer
        if (deltaY > 100) {
            onClose()
        }
        
        // Reset position
        drawerRef.current.style.transform = ''
    }

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const lineDiscountTotal = items.reduce((sum, item) => sum + item.discount, 0)

    const billDiscountAmount = billDiscount.type === 'flat'
        ? billDiscount.value
        : (subtotal - lineDiscountTotal) * (billDiscount.value / 100)

    const afterDiscount = subtotal - lineDiscountTotal - billDiscountAmount - couponDiscount
    const taxAmount = afterDiscount * (taxPercent / 100)
    const total = afterDiscount + taxAmount

    const cartContent = (
        <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                        <span>Cart ({items.length})</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        {items.length > 0 && (
                            <button
                                onClick={onClearCart}
                                className="text-sm text-red-600 hover:text-red-700 font-medium min-h-[44px] px-3"
                                aria-label="Clear cart"
                            >
                                Clear
                            </button>
                        )}
                        {isMobile && onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                                aria-label="Close cart"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-400" role="status">
                        <ShoppingCart className="h-12 w-12 mb-2" aria-hidden="true" />
                        <p className="text-sm">Cart is empty</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className="relative overflow-hidden"
                            onTouchStart={(e) => handleTouchStart(e, item.id)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            {/* Delete background (visible on swipe) */}
                            {isMobile && swipeItemId === item.id && (
                                <div className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-end pr-4">
                                    <Trash2 className="h-6 w-6 text-white" />
                                </div>
                            )}
                            
                            {/* Cart Item */}
                            <div
                                className="bg-gray-50 rounded-lg p-3 border border-gray-200 transition-transform touch-feedback"
                                style={{
                                    transform: swipeItemId === item.id ? `translateX(-${swipeDistance}px)` : 'translateX(0)',
                                }}
                            >
                                {/* Item Name & Price */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
                                        {item.sku && (
                                            <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="p-1.5 hover:bg-red-50 rounded text-red-600 tap-target flex items-center justify-center"
                                        aria-label={`Remove ${item.name} from cart`}
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 sm:gap-3" role="group" aria-label="Quantity controls">
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                            className="p-2 hover:bg-white active:bg-gray-100 rounded border border-gray-300 tap-target flex items-center justify-center touch-feedback"
                                            aria-label="Decrease quantity"
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                        <span className="w-10 sm:w-12 text-center font-medium text-sm sm:text-base" aria-live="polite">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                            className="p-2 hover:bg-white active:bg-gray-100 rounded border border-gray-300 tap-target flex items-center justify-center touch-feedback"
                                            aria-label="Increase quantity"
                                        >
                                            <Plus className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                        <span className="text-xs sm:text-sm text-gray-600">× ₹{item.unitPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm sm:text-base font-semibold text-gray-900">
                                            ₹{item.total.toFixed(2)}
                                        </p>
                                        {item.discount > 0 && (
                                            <p className="text-xs text-green-600">
                                                -₹{item.discount.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                            {/* Discount Button */}
                            {showDiscountInput === item.id ? (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        defaultValue={item.discountValue}
                                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm min-h-[44px]"
                                        onBlur={(e) => {
                                            const val = parseFloat(e.target.value) || 0
                                            onUpdateItemDiscount(item.id, item.discountType, val)
                                            setShowDiscountInput(null)
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = parseFloat(e.currentTarget.value) || 0
                                                onUpdateItemDiscount(item.id, item.discountType, val)
                                                setShowDiscountInput(null)
                                            }
                                        }}
                                        autoFocus
                                        aria-label="Enter discount value"
                                    />
                                    <select
                                        value={item.discountType}
                                        onChange={(e) => onUpdateItemDiscount(item.id, e.target.value as 'flat' | 'percent', item.discountValue)}
                                        className="px-2 py-1.5 border border-gray-300 rounded text-sm min-h-[44px]"
                                        aria-label="Discount type"
                                    >
                                        <option value="flat">₹</option>
                                        <option value="percent">%</option>
                                    </select>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDiscountInput(item.id)}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 min-h-[44px]"
                                    aria-label="Add discount to item"
                                >
                                    <Tag className="h-3 w-3" aria-hidden="true" />
                                    {item.discount > 0 ? 'Update Discount' : 'Add Discount'}
                                </button>
                            )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer - Bill Summary */}
            {items.length > 0 && (
                <div className="border-t border-gray-200 p-4 space-y-4 flex-shrink-0 bg-white">
                    {/* Bill Discount */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-16 flex-shrink-0" htmlFor="bill-discount-type">
                            Discount
                        </label>
                        <select
                            id="bill-discount-type"
                            value={billDiscount.type}
                            onChange={(e) => onBillDiscountChange(e.target.value as 'flat' | 'percent', billDiscount.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1.5 min-h-[44px]"
                            aria-label="Discount type"
                        >
                            <option value="flat">₹ Flat</option>
                            <option value="percent">% Percent</option>
                        </select>
                        <input
                            type="number"
                            value={billDiscount.value || ''}
                            onChange={(e) => onBillDiscountChange(billDiscount.type, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 min-h-[44px]"
                            min="0"
                            aria-label="Discount value"
                        />
                    </div>

                    {/* Coupon */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-16 flex-shrink-0">Coupon</label>
                        {couponApplied ? (
                            <div className="flex-1 flex items-center gap-2">
                                <span className="flex-1 text-xs bg-green-50 text-green-700 px-2 py-1.5 rounded border border-green-200">
                                    {couponCode} (-₹{couponDiscount.toFixed(2)})
                                </span>
                                <button
                                    onClick={onRemoveCoupon}
                                    className="text-xs text-red-600 hover:text-red-700 min-h-[44px] px-3"
                                    aria-label="Remove coupon"
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
                                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 min-h-[44px]"
                                    aria-label="Coupon code"
                                />
                                <button
                                    onClick={onApplyCoupon}
                                    disabled={!couponCode}
                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded disabled:bg-gray-300 min-h-[44px]"
                                    aria-label="Apply coupon"
                                >
                                    Apply
                                </button>
                            </>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="space-y-1.5 text-sm" role="region" aria-label="Order summary">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span aria-label={`Subtotal: ${subtotal.toFixed(2)} rupees`}>₹{subtotal.toFixed(2)}</span>
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
                            <span aria-live="polite" aria-atomic="true">₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onHoldBill}
                            className="flex-1 bg-amber-100 text-amber-700 py-3 rounded-lg font-medium hover:bg-amber-200 transition-colors text-sm min-h-[48px]"
                            aria-label="Hold bill for later (Press F5)"
                        >
                            <span className="hidden sm:inline">Hold (F5)</span>
                            <span className="sm:hidden">Hold</span>
                        </button>
                        <button
                            onClick={onCheckout}
                            disabled={checkoutLoading}
                            className="flex-[2] bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-h-[48px]"
                            aria-label="Proceed to payment (Press F12)"
                        >
                            {checkoutLoading ? 'Processing...' : (
                                <>
                                    <span className="hidden sm:inline">Pay (F12)</span>
                                    <span className="sm:hidden">Pay</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    )

    // Mobile: Full-screen modal, Desktop: Fixed panel
    if (isMobile) {
        return (
            <>
                {/* Overlay */}
                {isOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 fade-in"
                        onClick={onClose}
                        aria-hidden="true"
                    />
                )}

                {/* Mobile Drawer */}
                <div
                    ref={drawerRef}
                    className={`
                        fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl
                        transition-transform duration-300 ease-out
                        flex flex-col max-h-[85vh] safe-bottom
                        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
                    `}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Shopping cart"
                    onTouchStart={handleDrawerTouchStart}
                    onTouchMove={handleDrawerTouchMove}
                    onTouchEnd={handleDrawerTouchEnd}
                >
                    {/* Drag Handle */}
                    <div className="pt-2 pb-0 flex justify-center">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" aria-hidden="true" />
                    </div>
                    {cartContent}
                </div>
            </>
        )
    }

    // Desktop: Fixed side panel
    return (
        <div className="w-96 bg-white rounded-lg border border-gray-200 flex flex-col h-full shadow-sm">
            {cartContent}
        </div>
    )
}
