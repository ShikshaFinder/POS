'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Minus, Trash2, ShoppingCart, User, DollarSign, CreditCard, Smartphone, Wallet, X } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface Product {
  id: string
  name: string
  sku: string | null
  unitPrice: number
  currentStock: number
  unit: string
  category: string
  imageUrl: string | null
}

interface CartItem extends Product {
  quantity: number
}

interface Customer {
  id: string
  name: string
  phone: string | null
}

export default function CheckoutPage() {
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

  useEffect(() => {
    fetchProducts()
  }, [searchQuery])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/pos/products?search=${searchQuery}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
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
      alert('Cart is empty!')
      return
    }

    const total = calculateTotal()
    const paid = parseFloat(amountPaid) || 0

    if (paid < total) {
      alert('Insufficient payment amount!')
      return
    }

    setLoading(true)

    try {
      const subtotal = calculateSubtotal()
      const taxAmount = calculateTax(subtotal)

      const res = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          customerId: customer?.id,
          customerName: customer?.name,
          customerPhone: customer?.phone,
          paymentMethod,
          amountPaid: paid,
          taxPercent: 5,
          deliveryDate: deliveryDate || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setLastReceipt(data.transaction)
        setShowReceipt(true)
        // Clear cart
        setCart([])
        setAmountPaid('')
        setDeliveryDate('')
        setCustomer(null)
        setCustomerSearch('')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to complete checkout')
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Failed to complete checkout')
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

  return (
    <div className="h-full flex">
      {/* Left side - Products */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Checkout</h1>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group cursor-pointer hover:shadow-lg transition-all overflow-hidden"
              onClick={() => addToCart(product)}
            >
              <div className="relative h-32 w-full bg-gradient-to-br from-gray-50 to-gray-100">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400"><span class="text-5xl">${getCategoryIcon(product.category)}</span><span class="text-xs mt-1 text-gray-400">No image</span></div>`
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-5xl">{getCategoryIcon(product.category)}</span>
                    <span className="text-xs mt-1">No image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-green-600">
                    ₹{product.unitPrice?.toFixed(2)}
                  </span>
                  <span className={`text-sm ${product.currentStock > 0 ? 'text-gray-500' : 'text-red-500 font-medium'}`}>
                    {product.currentStock > 0 ? `Stock: ${product.currentStock}` : 'Out of Stock'} {product.unit}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Right side - Cart */}
      <div className="w-96 border-l bg-gray-50 flex flex-col">
        <div className="p-6 border-b bg-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.length})
          </h2>
        </div>

        {/* Customer Section */}
        <div className="p-4 border-b bg-white">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Customer phone/name..."
                className="pl-10"
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

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              Cart is empty
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        ₹{item.unitPrice} × {item.quantity}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={item.quantity >= item.currentStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="border-t bg-white p-4 space-y-4">
          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (5%):</span>
              <span>₹{calculateTax(calculateSubtotal()).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-green-600">₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-sm font-medium mb-2 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  variant={paymentMethod === method.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPaymentMethod(method.value as any)}
                  className="flex items-center gap-2"
                >
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="text-sm font-medium mb-2 block">Amount Paid</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="text-lg"
            />
            {amountPaid && (
              <p className="text-sm mt-1 text-gray-600">
                Change: ₹{calculateChange().toFixed(2)}
              </p>
            )}
          </div>

          {/* Delivery Date */}
          <div>
            <label className="text-sm font-medium mb-2 block">Delivery Date (Optional)</label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Checkout Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-green-500 text-6xl mb-4">✓</div>
              <h2 className="text-2xl font-bold mb-2">Sale Completed!</h2>
              <p className="text-gray-600">Receipt #{lastReceipt.receiptNumber}</p>
            </div>

            <div className="space-y-2 mb-6">
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.print()}
              >
                Print Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowReceipt(false)}
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
