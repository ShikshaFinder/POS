'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Phone, Mail, MapPin, ShoppingBag, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Customer {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  totalPurchases: number
  totalVisits: number
  lastVisitDate: string | null
  transactions: {
    id: string
    totalAmount: number
    transactionDate: string
  }[]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    countryCode: '+91',
    email: '',
    address: '',
  })

  useEffect(() => {
    fetchCustomers()
  }, [searchQuery])

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/pos/customers?search=${searchQuery}`)
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Enforce 10-digit phone number validation if phone is provided
    if (formData.phone) {
      const cleanedPhone = formData.phone.replace(/\D/g, '')
      if (cleanedPhone.length !== 10) {
        alert('Please enter a valid 10-digit mobile number')
        return
      }
    }

    setLoading(true)

    try {
      const fullPhone = formData.phone ? `${formData.countryCode} ${formData.phone}` : null

      const res = await fetch('/api/pos/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          phone: fullPhone
        }),
      })

      if (res.ok) {
        setShowDialog(false)
        setFormData({ name: '', phone: '', countryCode: '+91', email: '', address: '' })
        fetchCustomers()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create customer')
      }
    } catch (error) {
      console.error('Failed to create customer:', error)
      alert('Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your customer database
          </p>
        </div>
        <Button onClick={() => {
          setFormData({ name: '', phone: '', countryCode: '+91', email: '', address: '' })
          setShowDialog(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, phone, or email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active This Month</p>
              <p className="text-2xl font-bold">
                {customers.filter(c => {
                  if (!c.lastVisitDate) return false
                  const lastVisit = new Date(c.lastVisitDate)
                  const monthAgo = new Date()
                  monthAgo.setMonth(monthAgo.getMonth() - 1)
                  return lastVisit > monthAgo
                }).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold">
                ₹{customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="mb-3">
                <h3 className="font-semibold text-lg mb-1">{customer.name}</h3>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <Mail className="h-3 w-3" />
                    {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Purchases:</span>
                  <span className="font-semibold text-green-600">
                    ₹{(customer.totalPurchases || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Visits:</span>
                  <span className="font-semibold">{customer.totalVisits || 0}</span>
                </div>
                {customer.lastVisitDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Visit:</span>
                    <span className="text-gray-700">
                      {new Date(customer.lastVisitDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Customer name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone (Optional)</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  className="w-16 bg-gray-50 text-center font-semibold"
                  placeholder="+91"
                />
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    if (val.length <= 10) {
                      setFormData({ ...formData, phone: val })
                    }
                  }}
                  placeholder="9876543210"
                  className="flex-1"
                  maxLength={10}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">If provided, must be exactly 10 digits</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{selectedCustomer.name}</h3>
                <div className="space-y-1 text-sm">
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {selectedCustomer.phone}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      {selectedCustomer.address}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Purchases</p>
                  <p className="text-xl font-bold text-blue-600">
                    ₹{(selectedCustomer.totalPurchases || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Visits</p>
                  <p className="text-xl font-bold text-green-600">
                    {selectedCustomer.totalVisits || 0}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Avg. Order</p>
                  <p className="text-xl font-bold text-purple-600">
                    ₹{((selectedCustomer.totalPurchases || 0) / Math.max(selectedCustomer.totalVisits || 0, 1)).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Recent Transactions</h4>
                {selectedCustomer.transactions.length === 0 ? (
                  <p className="text-sm text-gray-500">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.transactions.map((txn) => (
                      <div
                        key={txn.id}
                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">
                          {new Date(txn.transactionDate).toLocaleDateString()}
                        </span>
                        <span className="font-semibold text-green-600">
                          ₹{txn.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
