'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, Users } from 'lucide-react'

interface DashboardStats {
  todaySales: number
  todayOrders: number
  lowStockItems: number
  totalCustomers: number
}

export default function POSDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/pos/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const statCards = [
    {
      name: "Today's Sales",
      value: `₹${stats?.todaySales?.toLocaleString() || 0}`,
      icon: DollarSign,
      change: '+12.5%',
      changeType: 'increase',
      color: 'bg-green-500'
    },
    {
      name: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: ShoppingCart,
      change: '+8.2%',
      changeType: 'increase',
      color: 'bg-blue-500'
    },
    {
      name: 'Low Stock Items',
      value: stats?.lowStockItems || 0,
      icon: Package,
      change: '-4.3%',
      changeType: 'decrease',
      color: 'bg-orange-500'
    },
    {
      name: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      change: '+5.1%',
      changeType: 'increase',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">POS Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`rounded-md p-3 ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.changeType === 'increase' ? (
                          <TrendingUp className="h-4 w-4 mr-0.5" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-0.5" />
                        )}
                        <span>{stat.change}</span>
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions Card */}
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a
              href="/pos/billing"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">New Sale</p>
                <p className="text-sm text-gray-500">Process a new transaction</p>
              </div>
            </a>
            <a
              href="/pos/stock"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Check Stock</p>
                <p className="text-sm text-gray-500">View inventory levels</p>
              </div>
            </a>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              <p>No recent activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
