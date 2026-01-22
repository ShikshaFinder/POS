'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Plus, Minus, Trash2, ShoppingCart, User, DollarSign, CreditCard, Smartphone, Wallet, X, ChevronLeft, Mail, Loader2, Check, ChevronRight, Phone, MessageCircle, ChevronDown, UserPlus, Zap } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { syncManager } from '@/lib/syncManager'
import { productSyncService } from '@/lib/productSyncService'
import { getCachedImageUrl } from '@/lib/imageCache'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  sku: string | null
  unitPrice: number
  currentStock: number
  unit: string
  category: string
  imageUrl: string | null
  cachedImageUrl?: string | null
}

interface CartItem extends Product {
  quantity: number
}

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
}

interface Category {
  id: string
  name: string
  productCount: number
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const categoryFilter = searchParams.get('category')

  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'WALLET'>('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [showMobileCart, setShowMobileCart] = useState(false)
  const [emailForReceipt, setEmailForReceipt] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFilter)

  // WhatsApp receipt states
  const [whatsappName, setWhatsappName] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)
  const [whatsappSent, setWhatsappSent] = useState(false)
  const [whatsappError, setWhatsappError] = useState('')
  const [saveCustomer, setSaveCustomer] = useState(false)

  // Customer dropdown states for WhatsApp
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [selectedWhatsappCustomer, setSelectedWhatsappCustomer] = useState<Customer | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')

  // Sync selectedCategory with URL param when it changes
  useEffect(() => {
    setSelectedCategory(categoryFilter)
  }, [categoryFilter])

  // Auto-fill amountPaid with total for all payment methods (including CASH)
  useEffect(() => {
    if (cart.length > 0) {
      const total = calculateTotal()
      setAmountPaid(total.toFixed(2))
    }
  }, [paymentMethod, cart])

  // Category-based fallback icons
  const getCategoryIcon = (category: string) => {
    const cat = category?.toUpperCase() || ''
    if (cat.includes('MILK')) return '🥛'
    if (cat.includes('PANEER') || cat.includes('CHEESE')) return '🧀'
    if (cat.includes('CURD') || cat.includes('YOGURT') || cat.includes('DAHI')) return '🥣'
    if (cat.includes('GHEE') || cat.includes('BUTTER')) return '🧈'
    if (cat.includes('CREAM')) return '🍶'
    if (cat.includes('POWDER')) return '📦'
    if (cat.includes('ICE') || cat.includes('CREAM')) return '🍦'
    if (cat.includes('BUTTERMILK') || cat.includes('CHAAS')) return '🥤'
    return '🥛' // Default dairy icon
  }

  // Fetch categories and customers on mount
  useEffect(() => {
    fetchCategories()
    fetchAllCustomers()
  }, [])

  // Fetch all customers for dropdown
  const fetchAllCustomers = async () => {
    try {
      const res = await fetch('/api/pos/customers')
      if (res.ok) {
        const data = await res.json()
        setAllCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  // Fetch products when search or category changes
  useEffect(() => {
    fetchProducts()
  }, [searchQuery, selectedCategory])

  const fetchCategories = async () => {
    try {
      // Try cached categories first
      const hasCachedData = await productSyncService.hasCachedData()

      if (hasCachedData) {
        const cachedCategories = await productSyncService.getCategories()
        if (cachedCategories.length > 0) {
          setCategories(cachedCategories.map(c => ({
            id: c.id,
            name: c.name,
            productCount: c.productCount
          })))
          return
        }
      }

      // Fall back to network
      const res = await fetch('/api/pos/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      // Try cache on network failure
      const cachedCategories = await productSyncService.getCategories()
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories.map(c => ({
          id: c.id,
          name: c.name,
          productCount: c.productCount
        })))
      }
    }
  }

  const fetchProducts = async () => {
    try {
      // Try to get from cache first
      const hasCachedData = await productSyncService.hasCachedData()

      if (hasCachedData) {
        // Use cached products
        let cachedProducts = await productSyncService.getProducts({
          search: searchQuery || undefined,
          categoryId: selectedCategory || undefined
        })

        // Load cached image URLs for products
        const productsWithImages = await Promise.all(
          cachedProducts.map(async (product) => {
            const cachedImageUrl = product.hasLocalImage
              ? await getCachedImageUrl(product.id)
              : null
            return {
              id: product.id,
              name: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice || 0,
              currentStock: product.currentStock || 0,
              unit: product.unit,
              category: product.category,
              imageUrl: product.imageUrl,
              cachedImageUrl
            } as Product
          })
        )

        setProducts(productsWithImages)
        return
      }

      // Fall back to network if no cached data
      let url = `/api/pos/products?search=${searchQuery}`
      if (selectedCategory) {
        url += `&category=${encodeURIComponent(selectedCategory)}`
      }
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      // Try cache on network failure
      const hasCachedData = await productSyncService.hasCachedData()
      if (hasCachedData) {
        const cachedProducts = await productSyncService.getProducts()
        const productsWithImages = await Promise.all(
          cachedProducts.map(async (product) => {
            const cachedImageUrl = product.hasLocalImage
              ? await getCachedImageUrl(product.id)
              : null
            return {
              id: product.id,
              name: product.name,
              sku: product.sku,
              unitPrice: product.unitPrice || 0,
              currentStock: product.currentStock || 0,
              unit: product.unit,
              category: product.category,
              imageUrl: product.imageUrl,
              cachedImageUrl
            } as Product
          })
        )
        setProducts(productsWithImages)
        toast.info('Using offline product data')
      }
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      if (existingItem.quantity < product.currentStock) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ))
      } else {
        alert('Insufficient stock!')
      }
    } else {
      if (product.currentStock > 0) {
        setCart([...cart, { ...product, quantity: 1 }])
      } else {
        alert('Product out of stock!')
      }
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta
        if (newQuantity <= 0) return item
        if (newQuantity > item.currentStock) {
          alert('Insufficient stock!')
          return item
        }
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId))
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  }

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.05 // 5% tax
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax(subtotal)
    return subtotal + tax
  }

  const calculateChange = () => {
    const total = calculateTotal()
    const paid = parseFloat(amountPaid) || 0
    return paid - total
  }

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty!')
      return
    }

    const total = calculateTotal()
    const paid = parseFloat(amountPaid) || 0

    if (paid < total) {
      toast.error('Insufficient payment amount!', {
        description: `Total: ₹${total.toFixed(2)}, Paid: ₹${paid.toFixed(2)}`,
      })
      return
    }

    setLoading(true)

    try {
      const subtotal = calculateSubtotal()
      const taxAmount = calculateTax(subtotal)

      // Prepare transaction data for offline-first sync
      const transactionData = {
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        totals: {
          subtotal,
          taxAmount,
          total,
        },
        payment: {
          method: paymentMethod,
          amountPaid: paid,
          changeGiven: paid - total,
        },
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
        } : undefined,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        taxPercent: 5,
        deliveryDate: deliveryDate || undefined,
      }

      // Save to IndexedDB first (INSTANT - offline-first)
      const localId = await syncManager.addTransaction(transactionData)

      // Generate a local receipt number for immediate display
      const localReceiptNumber = localId.substring(0, 12).toUpperCase()

      // Show instant success toast
      toast.success('Sale completed!', {
        description: `Receipt: ${localReceiptNumber}`,
        duration: 3000,
      })

      // Show success IMMEDIATELY with local receipt
      setLastReceipt({
        id: localId,
        receiptNumber: localReceiptNumber,
        totalAmount: total,
        amountPaid: paid,
        changeGiven: paid - total,
        paymentMethod,
        items: cart,
        customer,
        timestamp: Date.now(),
        syncStatus: 'pending', // Indicate it's pending sync
      })
      setShowReceipt(true)

      // Pre-fill email/WhatsApp if customer has contact info
      if (customer?.email) {
        setEmailForReceipt(customer.email)
      } else {
        setEmailForReceipt('')
      }
      if (customer?.phone) {
        setWhatsappPhone(customer.phone)
        setWhatsappName(customer.name || '')
      }
      setEmailSent(false)

      // Clear cart immediately
      setCart([])
      setAmountPaid('')
      setDeliveryDate('')
      setCustomer(null)
      setCustomerSearch('')

      // Background sync will happen automatically via syncManager

    } catch (error) {
      console.error('Checkout failed:', error)
      toast.error('Failed to save transaction', {
        description: 'Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  const searchCustomers = async (query: string) => {
    if (!query) return
    try {
      const res = await fetch(`/api/pos/customers?search=${query}`)
      if (res.ok) {
        const data = await res.json()
        if (data.customers.length > 0) {
          setCustomer(data.customers[0])
        }
      }
    } catch (error) {
      console.error('Failed to search customers:', error)
    }
  }

  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: DollarSign },
    { value: 'CARD', label: 'Card', icon: CreditCard },
    { value: 'UPI', label: 'UPI', icon: Smartphone },
    { value: 'WALLET', label: 'Wallet', icon: Wallet },
  ]

  const sendReceiptToEmail = async () => {
    if (!emailForReceipt || !lastReceipt) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailForReceipt)) {
      alert('Please enter a valid email address')
      return
    }

    setSendingEmail(true)
    try {
      const res = await fetch('/api/pos/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: lastReceipt.id,
          email: emailForReceipt,
        }),
      })

      if (res.ok) {
        setEmailSent(true)
        setTimeout(() => setEmailSent(false), 3000)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const sendReceiptToWhatsApp = async () => {
    if (!whatsappPhone || !lastReceipt) return

    // Basic phone validation (Indian mobile number)
    const cleanPhone = whatsappPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setWhatsappError('Please enter a valid 10-digit phone number')
      return
    }

    setSendingWhatsApp(true)
    setWhatsappError('')

    try {
      // Format the invoice message
      const customerName = whatsappName || 'Valued Customer'
      const formattedDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      const formattedAmount = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
      }).format(lastReceipt.totalAmount)

      const message = `Hello ${customerName},

Thank you for your purchase! 🙏

🧾 Invoice No: ${lastReceipt.receiptNumber}
💰 Amount: ${formattedAmount}
📅 Date: ${formattedDate}

We appreciate your visit!`

      // Save customer if checkbox is checked and it's a new customer
      if (saveCustomer && whatsappName && !selectedWhatsappCustomer) {
        try {
          const customerRes = await fetch('/api/pos/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: whatsappName,
              phone: cleanPhone,
            }),
          })
          if (customerRes.ok) {
            // Refresh customer list
            fetchAllCustomers()
          }
        } catch (err) {
          console.error('Failed to save customer:', err)
          // Don't block WhatsApp sending if customer save fails
        }
      }

      const res = await fetch('/api/pos/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          message: message,
          invoiceId: lastReceipt.id,
          customerName: customerName,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setWhatsappSent(true)
        setTimeout(() => setWhatsappSent(false), 3000)
      } else {
        setWhatsappError(data.error || 'Failed to send WhatsApp message')
      }
    } catch (error) {
      console.error('Failed to send WhatsApp:', error)
      setWhatsappError('Failed to send WhatsApp message')
    } finally {
      setSendingWhatsApp(false)
    }
  }

  // Handle customer selection from dropdown
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedWhatsappCustomer(customer)
    setWhatsappName(customer.name)
    setWhatsappPhone(customer.phone || '')
    setShowCustomerDropdown(false)
    setCustomerSearchQuery('')
    setSaveCustomer(false) // No need to save existing customer
  }

  // Filter customers based on search
  const filteredCustomers = allCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearchQuery))
  )

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row relative">
      {/* Left side - Products */}
      <div className={`flex-1 h-full p-4 sm:p-6 overflow-y-auto ${showMobileCart ? 'hidden lg:block' : ''}`}>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Checkout</h1>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Horizontal Category Tabs - Mobile Friendly */}
          <div className="mt-3 -mx-4 px-4 lg:mx-0 lg:px-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* All Tab */}
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0",
                  selectedCategory === null
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                )}
              >
                All
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                  selectedCategory === null
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {categories.reduce((sum, cat) => sum + cat.productCount, 0)}
                </span>
              </button>

              {/* Category Tabs */}
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0",
                    selectedCategory === category.name
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                  )}
                >
                  {category.name}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                    selectedCategory === category.name
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}>
                    {category.productCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 pb-40 lg:pb-4">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => addToCart(product)}
              className="cursor-pointer select-none"
            >
              <Card
                className="group hover:shadow-lg transition-all overflow-hidden h-full"
              >
                <div className="relative h-24 sm:h-32 w-full bg-gradient-to-br from-gray-50 to-gray-100">
                  {(product.cachedImageUrl || product.imageUrl) ? (
                    <Image
                      src={product.cachedImageUrl || product.imageUrl!}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400"><span class="text-4xl sm:text-5xl">${getCategoryIcon(product.category)}</span><span class="text-xs mt-1 text-gray-400">No image</span></div>`
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <span className="text-4xl sm:text-5xl">{getCategoryIcon(product.category)}</span>
                      <span className="text-xs mt-1">No image</span>
                    </div>
                  )}
                </div>
                <div className="p-2 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-lg mb-1 truncate">{product.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 truncate">{product.category}</p>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="text-base sm:text-xl font-bold text-green-600">
                      ₹{product.unitPrice?.toFixed(2)}
                    </span>
                    <span className={`text-xs sm:text-sm ${product.currentStock > 0 ? 'text-gray-500' : 'text-red-500 font-medium'}`}>
                      {product.currentStock > 0 ? `Stock: ${product.currentStock}` : 'Out of Stock'} {product.unit}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Floating Summary Bar - Fixed above MobileNav */}
      <div className={cn(
        "lg:hidden fixed bottom-16 left-0 right-0 z-50 transition-all duration-300",
        cart.length > 0 ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Cart summary bar */}
        <div className="bg-white border-t shadow-2xl">
          <div className="p-3 sm:p-4">
            {/* Summary Info Row */}
            <div
              className="flex items-center justify-between gap-3 cursor-pointer"
              onClick={() => setShowMobileCart(true)}
            >
              {/* Left: Total and Items */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                  </div>
                  {/* Item Count Badge */}
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    ₹{calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Center: Payment Method Icon */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  paymentMethod === 'CASH' && "bg-green-100",
                  paymentMethod === 'CARD' && "bg-blue-100",
                  paymentMethod === 'UPI' && "bg-purple-100",
                  paymentMethod === 'WALLET' && "bg-amber-100"
                )}>
                  {paymentMethod === 'CASH' && <DollarSign className="h-5 w-5 text-green-600" />}
                  {paymentMethod === 'CARD' && <CreditCard className="h-5 w-5 text-blue-600" />}
                  {paymentMethod === 'UPI' && <Smartphone className="h-5 w-5 text-purple-600" />}
                  {paymentMethod === 'WALLET' && <Wallet className="h-5 w-5 text-amber-600" />}
                </div>
              </div>

              {/* Right: Place Order Button */}
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 h-12 rounded-xl font-semibold shadow-lg shadow-green-200 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMobileCart(true)
                }}
              >
                <span className="hidden sm:inline">Place Order</span>
                <span className="sm:hidden">Order</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Cart */}
      <div className={`
        fixed inset-x-0 top-0 bottom-16 z-50 bg-gray-50 flex flex-col
        lg:static lg:inset-auto lg:bottom-auto lg:w-96 lg:min-w-[320px] lg:max-w-md lg:border-l lg:z-auto lg:flex-shrink-0 lg:h-screen lg:max-h-screen lg:overflow-hidden
        transform transition-transform duration-300 ease-in-out
        ${showMobileCart ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:visible lg:pointer-events-auto
      `}>
        <div className="p-3 sm:p-4 lg:p-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden -ml-2"
              onClick={() => setShowMobileCart(false)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-base sm:text-lg lg:text-base font-bold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 lg:h-4 lg:w-4" />
              Cart ({cart.length})
            </h2>
          </div>
        </div>

        {/* Customer Section */}
        <div className="p-2 sm:p-3 lg:p-2 border-b bg-white">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Customer phone/name..."
                className="pl-10 text-sm sm:text-base"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchCustomers(customerSearch)
                  }
                }}
              />
            </div>
            {customer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomer(null)
                  setCustomerSearch('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {customer && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
              <p className="font-semibold">{customer.name}</p>
              <p className="text-gray-600">{customer.phone}</p>
            </div>
          )}
        </div>

        {/* Top Quick Billing Button */}
        {cart.length > 0 && (
          <div className="px-2 sm:px-3 lg:px-2 pb-2">
            <Button
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 font-semibold"
              size="sm"
              onClick={handleCheckout}
              disabled={loading}
            >
              <Zap className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : `Quick Bill • ${cart.reduce((sum, item) => sum + item.quantity, 0)} items • ₹${calculateTotal().toFixed(2)}`}
            </Button>
          </div>
        )}

        {/* Cart Items */}
        <div className={`${cart.length === 0 ? 'flex-none' : 'flex-1'} min-h-0 overflow-y-auto p-2 sm:p-3 lg:p-2`}>
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-4">
              Cart is empty
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="bg-white p-2 sm:p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base truncate">{item.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-500">
                        ₹{item.unitPrice} × {item.quantity}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold text-sm sm:text-base">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={item.quantity >= item.currentStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold text-sm sm:text-base">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Section - Fixed at bottom */}
        <div className="flex-shrink-0 border-t bg-white p-2 sm:p-3 lg:p-2 pb-3 lg:pb-2 space-y-1.5 sm:space-y-2 lg:space-y-1.5">
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Tax (5%):</span>
              <span>₹{calculateTax(calculateSubtotal()).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base font-bold border-t pt-1">
              <span>Total:</span>
              <span className="text-green-600">₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-medium mb-1 block">Payment Method</label>
            <div className="grid grid-cols-4 gap-1">
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  variant={paymentMethod === method.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod(method.value as any)}
                  className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-1 text-xs"
                >
                  <method.icon className="h-4 w-4" />
                  <span className="text-[10px]">{method.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Paid & Delivery Date - Side by side on mobile */}
          <div className="grid grid-cols-2 gap-2">
            {/* Amount Paid */}
            <div>
              <label className="text-xs font-medium mb-1 block">Amount Paid</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="text-sm h-9"
              />
              {amountPaid && (
                <p className="text-xs mt-0.5 text-gray-600">
                  Change: ₹{calculateChange().toFixed(2)}
                </p>
              )}
            </div>

            {/* Delivery Date */}
            <div>
              <label className="text-xs font-medium mb-1 block">Delivery Date</label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Quick Billing Button */}
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 font-bold text-base"
            size="lg"
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
          >
            <Zap className="h-5 w-5 mr-2" />
            {loading ? 'Processing...' : `Quick Bill • ${cart.reduce((sum, item) => sum + item.quantity, 0)} items • ₹${calculateTotal().toFixed(2)}`}
          </Button>

          {/* Complete Sale Button */}
          <Button
            className="w-full mt-2"
            variant="outline"
            size="default"
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-8 max-w-md w-full mx-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="text-green-500 text-4xl sm:text-6xl mb-2 sm:mb-4">✓</div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Sale Completed!</h2>
              <p className="text-sm sm:text-base text-gray-600">Receipt #{lastReceipt.receiptNumber}</p>
            </div>

            <div className="space-y-2 mb-4 sm:mb-6 text-sm sm:text-base">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold">₹{lastReceipt.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span>₹{lastReceipt.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span>₹{lastReceipt.changeGiven.toFixed(2)}</span>
              </div>
            </div>

            {/* WhatsApp Receipt Section */}
            <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-green-600" />
                <label className="text-sm font-medium text-gray-700">
                  Send Receipt via WhatsApp
                </label>
              </div>
              <div className="space-y-2">
                {/* Customer Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-white hover:bg-gray-50"
                  >
                    <span className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4" />
                      {selectedWhatsappCustomer ? selectedWhatsappCustomer.name : 'Select existing customer...'}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showCustomerDropdown && "rotate-180")} />
                  </button>

                  {/* Dropdown Menu */}
                  {showCustomerDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {/* Search Input */}
                      <div className="p-2 border-b sticky top-0 bg-white">
                        <Input
                          type="text"
                          placeholder="Search customers..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="text-sm h-8"
                          autoFocus
                        />
                      </div>

                      {/* Customer List */}
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 flex items-center justify-between"
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-gray-500 text-xs">{c.phone}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {customerSearchQuery ? 'No customers found' : 'No customers yet'}
                        </div>
                      )}

                      {/* New Customer Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWhatsappCustomer(null)
                          setWhatsappName('')
                          setWhatsappPhone('')
                          setShowCustomerDropdown(false)
                          setSaveCustomer(true)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 border-t text-blue-600"
                      >
                        <UserPlus className="h-4 w-4" />
                        Add new customer
                      </button>
                    </div>
                  )}
                </div>

                {/* Customer Name */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Customer name"
                    value={whatsappName}
                    onChange={(e) => {
                      setWhatsappName(e.target.value)
                      if (selectedWhatsappCustomer) {
                        setSelectedWhatsappCustomer(null)
                      }
                    }}
                    className="pl-10 text-sm"
                    disabled={sendingWhatsApp}
                  />
                </div>

                {/* Phone Number */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="Phone number (10 digits)"
                      value={whatsappPhone}
                      onChange={(e) => {
                        setWhatsappPhone(e.target.value)
                        setWhatsappError('')
                        if (selectedWhatsappCustomer) {
                          setSelectedWhatsappCustomer(null)
                        }
                      }}
                      className="pl-10 text-sm"
                      disabled={sendingWhatsApp}
                      maxLength={10}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={sendReceiptToWhatsApp}
                    disabled={sendingWhatsApp || !whatsappPhone || whatsappSent}
                    className="shrink-0 bg-green-500 hover:bg-green-600 text-white border-green-500"
                  >
                    {sendingWhatsApp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : whatsappSent ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        Send
                      </span>
                    )}
                  </Button>
                </div>

                {/* Save Customer Checkbox - only show for new customers */}
                {!selectedWhatsappCustomer && whatsappName && whatsappPhone && (
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveCustomer}
                      onChange={(e) => setSaveCustomer(e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    Save customer for future orders
                  </label>
                )}
              </div>
              {whatsappSent && (
                <p className="text-xs text-green-600 mt-1">WhatsApp message sent successfully!</p>
              )}
              {whatsappError && (
                <p className="text-xs text-red-500 mt-1">{whatsappError}</p>
              )}
            </div>

            {/* Email Receipt Section */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <label className="text-sm font-medium text-gray-700">
                  Send Receipt via Email
                </label>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={emailForReceipt}
                    onChange={(e) => setEmailForReceipt(e.target.value)}
                    className="pl-10 text-sm"
                    disabled={sendingEmail}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendReceiptToEmail}
                  disabled={sendingEmail || !emailForReceipt || emailSent}
                  className="shrink-0"
                >
                  {sendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : emailSent ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
              {emailSent && (
                <p className="text-xs text-green-600 mt-1">Receipt sent successfully!</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setShowReceipt(false)
                  setShowMobileCart(false)
                  setEmailForReceipt('')
                  setEmailSent(false)
                  setWhatsappName('')
                  setWhatsappPhone('')
                  setWhatsappSent(false)
                  setWhatsappError('')
                  setSelectedWhatsappCustomer(null)
                  setSaveCustomer(false)
                  setShowCustomerDropdown(false)
                  setCustomerSearchQuery('')
                }}
              >
                New Sale
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
