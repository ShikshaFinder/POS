'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  TrendingUp, ShoppingCart, Package, DollarSign, Users,
  Clock, Receipt, BarChart3, AlertTriangle, PlayCircle,
  ArrowRight, Keyboard, Banknote, CreditCard, Smartphone,
  Store
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardStats {
  todaySales: number
  todayTransactions: number
  lowStockItems: number
  totalCustomers: number
  averageTicket: number
  paymentBreakdown: {
    cash: number
    card: number
    upi: number
    wallet: number
  }
  recentTransactions: {
    receiptNumber: string
    amount: number
    time: string
    paymentMethod: string
  }[]
  activeSession: {
    sessionNumber: string
    openedAt: string
    totalSales: number
  } | null
}

export default function POSHomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      // Use mock data if API fails
      setStats({
        todaySales: 0,
        todayTransactions: 0,
        lowStockItems: 0,
        totalCustomers: 0,
        averageTicket: 0,
        paymentBreakdown: { cash: 0, card: 0, upi: 0, wallet: 0 },
        recentTransactions: [],
        activeSession: null
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    // Refresh stats every minute
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [fetchStats])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-lg">Loading POS...</p>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      name: 'New Sale',
      description: 'Start a new transaction',
      href: '/pos/billing',
      icon: ShoppingCart,
      color: 'bg-blue-600 hover:bg-blue-700',
      shortcut: 'F1'
    },
    {
      name: 'Sessions',
      description: 'Open or close shift',
      href: '/pos/sessions',
      icon: Clock,
      color: 'bg-green-600 hover:bg-green-700',
      shortcut: 'F2'
    },
    {
      name: 'Receipts',
      description: 'View past transactions',
      href: '/pos/receipts',
      icon: Receipt,
      color: 'bg-purple-600 hover:bg-purple-700',
      shortcut: 'F3'
    },
    {
      name: 'Reports',
      description: 'Sales & analytics',
      href: '/pos/reports',
      icon: BarChart3,
      color: 'bg-amber-600 hover:bg-amber-700',
      shortcut: 'F4'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Flexi POS</h1>
                <p className="text-xs text-gray-500">Point of Sale System</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-sm text-gray-500">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Session Status Banner */}
          {stats?.activeSession ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-semibold text-green-800">
                    Shift Active: {stats.activeSession.sessionNumber}
                  </p>
                  <p className="text-sm text-green-600">
                    Started at {format(new Date(stats.activeSession.openedAt), 'HH:mm')} •
                    Sales: ₹{stats.activeSession.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <Link
                href="/pos/sessions"
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Manage Shift
              </Link>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">No Active Shift</p>
                  <p className="text-sm text-amber-600">Open a shift to start processing sales</p>
                </div>
              </div>
              <Link
                href="/pos/sessions"
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                <PlayCircle className="h-4 w-4" />
                Open Shift
              </Link>
            </div>
          )}

          {/* Main CTA - Start Billing */}
          <Link
            href="/pos/billing"
            className="block bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.01] group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">Start New Sale</h2>
                  <p className="text-blue-100 text-lg">Click here or press F1 to begin billing</p>
                </div>
              </div>
              <ArrowRight className="h-10 w-10 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Today's Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{(stats?.todaySales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              {stats?.todaySales && stats.todaySales > 0 && (
                <div className="mt-3 flex items-center text-sm text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>Sales today</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.todayTransactions || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                Avg. ₹{(stats?.averageTicket || 0).toFixed(0)} per order
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                Registered customers
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Low Stock</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    (stats?.lowStockItems || 0) > 0 ? "text-amber-600" : "text-gray-900"
                  )}>
                    {stats?.lowStockItems || 0}
                  </p>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  (stats?.lowStockItems || 0) > 0 ? "bg-amber-100" : "bg-gray-100"
                )}>
                  <Package className={cn(
                    "h-6 w-6",
                    (stats?.lowStockItems || 0) > 0 ? "text-amber-600" : "text-gray-400"
                  )} />
                </div>
              </div>
              {(stats?.lowStockItems || 0) > 0 && (
                <div className="mt-3 text-sm text-amber-600">
                  Items need restock
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-gray-500" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  className={cn(
                    "flex flex-col items-center p-6 rounded-xl text-white transition-all hover:scale-105 shadow-lg",
                    action.color
                  )}
                >
                  <action.icon className="h-10 w-10 mb-3" />
                  <span className="font-semibold text-lg">{action.name}</span>
                  <span className="text-sm opacity-75">{action.description}</span>
                  <span className="mt-2 px-2 py-0.5 bg-white/20 rounded text-xs font-mono">{action.shortcut}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Transactions & Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <Link href="/pos/receipts" className="text-sm text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
              {!stats?.recentTransactions?.length ? (
                <div className="text-center py-12 text-gray-400">
                  <Receipt className="h-16 w-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg">No transactions today</p>
                  <p className="text-sm">Start billing to see transactions here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentTransactions.slice(0, 5).map((tx, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-mono text-sm text-blue-600">{tx.receiptNumber}</p>
                        <p className="text-xs text-gray-500">{tx.time} • {tx.paymentMethod}</p>
                      </div>
                      <span className="font-semibold text-lg">₹{tx.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Payment Summary</h3>
              <div className="space-y-4">
                {[
                  { key: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-600', bg: 'bg-green-100' },
                  { key: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-100' },
                  { key: 'upi', label: 'UPI', icon: Smartphone, color: 'text-purple-600', bg: 'bg-purple-100' },
                ].map(({ key, label, icon: Icon, color, bg }) => {
                  const amount = stats?.paymentBreakdown?.[key as keyof typeof stats.paymentBreakdown] || 0
                  const total = (stats?.todaySales || 1)
                  const percentage = total > 0 ? (amount / total) * 100 : 0
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bg)}>
                        <Icon className={cn("h-6 w-6", color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-gray-700">{label}</span>
                          <span className="font-semibold">₹{amount.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", bg.replace('100', '500'))}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
