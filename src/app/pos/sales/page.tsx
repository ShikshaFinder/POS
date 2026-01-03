'use client'

import { useEffect, useState } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Clock } from 'lucide-react'

interface Sale {
  id: string
  customerName: string | null
  customerPhone: string | null
  totalAmount: number
  createdAt: string
  items: {
    product: {
      name: string
    }
    quantity: number
    price: number
  }[]
}

interface TodayStats {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
}

export default function TodaysSalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<TodayStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodaysSales()
  }, [])

  const fetchTodaysSales = async () => {
    try {
      const res = await fetch('/api/pos/sales/today')
      if (res.ok) {
        const data = await res.json()
        setSales(data.sales || [])
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today's Sales</h1>
        <p className="mt-1 text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md p-3 bg-green-500">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{stats?.totalSales.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md p-3 bg-blue-500">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.totalOrders || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="rounded-md p-3 bg-purple-500">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{stats?.averageOrderValue.toFixed(2) || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {sales.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No sales recorded today
            </div>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {sale.customerName || 'Walk-in Customer'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                          {sale.customerPhone && ` • ${sale.customerPhone}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sale.items.map((item, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {item.product.name} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ₹{sale.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {new Date(sale.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
