'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import ProductGrid from '@/components/pos/ProductGrid'
import CategoryTabs from '@/components/pos/CategoryTabs'
import CartPanel, { CartItem } from '@/components/pos/CartPanel'
import PaymentModal, { PaymentDetails } from '@/components/pos/PaymentModal'
import HeldBillsPanel, { HeldBill } from '@/components/pos/HeldBillsPanel'

interface Product {
  id: string
  name: string
  sku: string | null
  unitPrice: number | null
  markedPrice: number | null
  currentStock: number | null
  reorderLevel: number | null
  unit: string
  category: string
  categoryId: string | null
  imageUrl: string | null
}

interface Category {
  id: string
  name: string
  productCount: number
}

export default function BillingPage() {
  // Products state
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [productsLoading, setProductsLoading] = useState(true)

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [billDiscount, setBillDiscount] = useState<{ type: 'flat' | 'percent'; value: number }>({ type: 'flat', value: 0 })
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const taxPercent = 0 // Can be configured

  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Held bills state
  const [heldBills, setHeldBills] = useState<HeldBill[]>([])
  const [showHeldBills, setShowHeldBills] = useState(false)

  // Customer state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory && !selectedCategory.startsWith('legacy_')) {
        params.append('categoryId', selectedCategory)
      }

      const res = await fetch(`/api/pos/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        let filteredProducts = data.products || []

        // Handle legacy category filtering
        if (selectedCategory?.startsWith('legacy_')) {
          const legacyCat = selectedCategory.replace('legacy_', '')
          filteredProducts = filteredProducts.filter((p: Product) => p.category === legacyCat)
        }

        setProducts(filteredProducts)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      toast.error('Failed to load products')
    } finally {
      setProductsLoading(false)
    }
  }, [searchQuery, selectedCategory])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }, [])

  // Fetch held bills
  const fetchHeldBills = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/held-bills')
      if (res.ok) {
        const data = await res.json()
        const bills = (data.heldBills || []).map((bill: any) => ({
          ...bill,
          timestamp: new Date(bill.timestamp)
        }))
        setHeldBills(bills)
      }
    } catch (error) {
      console.error('Failed to fetch held bills:', error)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetchCategories()
    fetchHeldBills()
  }, [fetchCategories, fetchHeldBills])

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const lineDiscountTotal = cart.reduce((sum, item) => sum + item.discount, 0)
    const billDiscountAmount = billDiscount.type === 'flat'
      ? billDiscount.value
      : (subtotal - lineDiscountTotal) * (billDiscount.value / 100)
    const afterDiscount = subtotal - lineDiscountTotal - billDiscountAmount - couponDiscount
    const taxAmount = afterDiscount * (taxPercent / 100)
    const total = afterDiscount + taxAmount

    return { subtotal, lineDiscountTotal, billDiscountAmount, taxAmount, total }
  }, [cart, billDiscount, couponDiscount, taxPercent])

  // Add product to cart
  const addToCart = useCallback((product: Product) => {
    if ((product.currentStock ?? 0) <= 0) {
      toast.error('Product is out of stock')
      return
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id)

      if (existing) {
        if (existing.quantity >= (product.currentStock ?? 0)) {
          toast.error('Insufficient stock')
          return prevCart
        }
        return prevCart.map(item => {
          if (item.id === product.id) {
            const newQty = item.quantity + 1
            const subtotal = item.unitPrice * newQty
            const discount = item.discountType === 'flat'
              ? item.discountValue
              : subtotal * (item.discountValue / 100)
            return {
              ...item,
              quantity: newQty,
              subtotal,
              discount,
              total: subtotal - discount
            }
          }
          return item
        })
      }

      const price = product.unitPrice ?? 0
      toast.success(`${product.name} added`)
      return [...prevCart, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: price,
        markedPrice: product.markedPrice,
        quantity: 1,
        unit: product.unit,
        discount: 0,
        discountType: 'flat' as const,
        discountValue: 0,
        subtotal: price,
        total: price
      }]
    })
  }, [])

  // Update quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId))
      toast.success('Item removed')
      return
    }

    const product = products.find(p => p.id === itemId)
    if (product && quantity > (product.currentStock ?? 0)) {
      toast.error('Insufficient stock')
      return
    }

    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const subtotal = item.unitPrice * quantity
        const discount = item.discountType === 'flat'
          ? item.discountValue
          : subtotal * (item.discountValue / 100)
        return {
          ...item,
          quantity,
          subtotal,
          discount,
          total: subtotal - discount
        }
      }
      return item
    }))
  }, [products])

  // Update item discount
  const updateItemDiscount = useCallback((itemId: string, type: 'flat' | 'percent', value: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const subtotal = item.unitPrice * item.quantity
        const discount = type === 'flat' ? value : subtotal * (value / 100)
        return {
          ...item,
          discountType: type,
          discountValue: value,
          discount,
          total: subtotal - discount
        }
      }
      return item
    }))
  }, [])

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId))
    toast.success('Item removed')
  }, [])

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([])
    setBillDiscount({ type: 'flat', value: 0 })
    setCouponCode('')
    setCouponApplied(false)
    setCouponDiscount(0)
    setCustomerName('')
    setCustomerPhone('')
  }, [])

  // Apply coupon (mock implementation)
  const applyCoupon = useCallback(() => {
    // In production, validate coupon via API
    if (couponCode === 'SAVE10') {
      const totals = calculateTotals()
      setCouponDiscount(totals.subtotal * 0.1)
      setCouponApplied(true)
      toast.success('Coupon applied: 10% off')
    } else if (couponCode === 'FLAT50') {
      setCouponDiscount(50)
      setCouponApplied(true)
      toast.success('Coupon applied: ₹50 off')
    } else {
      toast.error('Invalid coupon code')
    }
  }, [couponCode, calculateTotals])

  // Remove coupon
  const removeCoupon = useCallback(() => {
    setCouponCode('')
    setCouponApplied(false)
    setCouponDiscount(0)
  }, [])

  // Hold bill
  const holdBill = useCallback(async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    try {
      const totals = calculateTotals()
      const res = await fetch('/api/pos/held-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customerName,
          customerPhone,
          total: totals.total,
          billDiscount,
          couponCode: couponApplied ? couponCode : undefined
        })
      })

      if (res.ok) {
        toast.success('Bill held successfully')
        clearCart()
        fetchHeldBills()
      } else {
        toast.error('Failed to hold bill')
      }
    } catch (error) {
      console.error('Hold bill error:', error)
      toast.error('Failed to hold bill')
    }
  }, [cart, customerName, customerPhone, calculateTotals, billDiscount, couponCode, couponApplied, clearCart, fetchHeldBills])

  // Resume held bill
  const resumeBill = useCallback((bill: HeldBill) => {
    setCart(bill.items)
    setCustomerName(bill.customerName || '')
    setShowHeldBills(false)
    toast.success('Bill resumed')

    // Delete from held bills
    fetch(`/api/pos/held-bills?id=${bill.id}`, { method: 'DELETE' })
      .then(() => fetchHeldBills())
  }, [fetchHeldBills])

  // Delete held bill
  const deleteHeldBill = useCallback(async (billId: string) => {
    try {
      await fetch(`/api/pos/held-bills?id=${billId}`, { method: 'DELETE' })
      toast.success('Held bill deleted')
      fetchHeldBills()
    } catch (error) {
      toast.error('Failed to delete')
    }
  }, [fetchHeldBills])

  // Process checkout
  const processCheckout = useCallback(async (payment: PaymentDetails) => {
    setCheckoutLoading(true)
    try {
      const totals = calculateTotals()

      const res = await fetch('/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.unitPrice,
            discount: item.discount,
            discountType: item.discountType
          })),
          customerName,
          customerPhone,
          paymentMethod: payment.method,
          amountPaid: payment.amountPaid,
          changeGiven: payment.changeGiven,
          cashAmount: payment.cashAmount,
          cardAmount: payment.cardAmount,
          upiAmount: payment.upiAmount,
          walletAmount: payment.walletAmount,
          billDiscount: billDiscount.type === 'flat' ? billDiscount.value : totals.subtotal * (billDiscount.value / 100),
          billDiscountType: billDiscount.type,
          couponCode: couponApplied ? couponCode : undefined,
          couponDiscount,
          taxPercent,
          taxAmount: totals.taxAmount,
          roundOff: payment.roundOff,
          subtotal: totals.subtotal,
          totalAmount: totals.total,
          notes: payment.notes
        })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Sale completed! Receipt: ${data.receiptNumber}`)
        setShowPaymentModal(false)
        clearCart()
        fetchProducts() // Refresh stock

        // TODO: WhatsApp bill sending will be implemented here
        // if (customerPhone) {
        //   await sendWhatsAppBill(data.transactionId, customerPhone)
        // }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Checkout failed')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to process sale')
    } finally {
      setCheckoutLoading(false)
    }
  }, [cart, customerName, customerPhone, billDiscount, couponCode, couponApplied, couponDiscount, taxPercent, calculateTotals, clearCart, fetchProducts])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur()
        }
        return
      }

      switch (e.key) {
        case 'F2':
          e.preventDefault()
          searchInputRef.current?.focus()
          break
        case 'F5':
          e.preventDefault()
          holdBill()
          break
        case 'F6':
          e.preventDefault()
          setShowHeldBills(true)
          break
        case 'F12':
          e.preventDefault()
          if (cart.length > 0) {
            setShowPaymentModal(true)
          }
          break
        case 'Escape':
          setShowPaymentModal(false)
          setShowHeldBills(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [holdBill, cart.length])

  const totals = calculateTotals()

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* Header with Customer Info */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              F2: Search • F5: Hold • F6: Held Bills • F12: Pay
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        {/* Product Grid */}
        <div className="flex-1 min-h-0">
          <ProductGrid
            products={products}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onProductClick={addToCart}
            loading={productsLoading}
          />
        </div>
      </div>

      {/* Right Side - Cart */}
      <CartPanel
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onUpdateItemDiscount={updateItemDiscount}
        onClearCart={clearCart}
        billDiscount={billDiscount}
        onBillDiscountChange={(type, value) => setBillDiscount({ type, value })}
        taxPercent={taxPercent}
        couponCode={couponCode}
        onCouponChange={setCouponCode}
        couponApplied={couponApplied}
        couponDiscount={couponDiscount}
        onApplyCoupon={applyCoupon}
        onRemoveCoupon={removeCoupon}
        onCheckout={() => setShowPaymentModal(true)}
        onHoldBill={holdBill}
        checkoutLoading={checkoutLoading}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={totals.total}
        onConfirmPayment={processCheckout}
        loading={checkoutLoading}
      />

      {/* Held Bills Panel */}
      <HeldBillsPanel
        bills={heldBills}
        onResume={resumeBill}
        onDelete={deleteHeldBill}
        isOpen={showHeldBills}
        onClose={() => setShowHeldBills(false)}
      />
    </div>
  )
}
