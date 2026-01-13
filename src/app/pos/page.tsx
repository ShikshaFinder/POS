'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  TrendingUp, ShoppingCart, Package, DollarSign, Users,
  Clock, Receipt, BarChart3, AlertTriangle, PlayCircle,
  ArrowRight, Keyboard, Banknote, CreditCard, Smartphone
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

export default function POSDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Redirect to checkout page on load
  useEffect(() => {
    router.replace('/pos/checkout')
  }, [router])

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
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
      shortcut: 'Alt+N'
    },
    {
      name: 'Sessions',
      description: 'Open or close shift',
      href: '/pos/sessions',
      icon: Clock,
      color: 'bg-green-600 hover:bg-green-700',
      shortcut: 'Alt+S'
    },
    {
      name: 'Receipts',
      description: 'View past transactions',
      href: '/pos/receipts',
      icon: Receipt,
      color: 'bg-purple-600 hover:bg-purple-700',
      shortcut: 'Alt+R'
    },
    {
      name: 'Reports',
      description: 'Sales & analytics',
      href: '/pos/reports',
      icon: BarChart3,
      color: 'bg-amber-600 hover:bg-amber-700',
      shortcut: 'Alt+T'
    },
  ]

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Time */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">POS Dashboard</h1>
          <p className="mt-1 text-gray-500">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-gray-900 font-mono">
            {format(currentTime, 'HH:mm')}
          </p>
          <p className="text-sm text-gray-500">
            {stats?.activeSession ? (
              <span className="text-green-600 flex items-center gap-1 justify-end">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Shift Active: {stats.activeSession.sessionNumber}
              </span>
            ) : (
              <span className="text-amber-600">No active shift</span>
            )}
          </p>
        </div>
      </div>

      {/* Main CTA - Start Billing */}
      {/* Main CTA - Start Billing */}
      <Link
        href="/pos/billing"
        className="group block bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Start New Sale</h2>
              <p className="text-blue-100 text-sm sm:text-base">Tap here to begin billing</p>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
      </Link>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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
              <span>+12% from yesterday</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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
              <AlertTriangle className={cn(
                "h-6 w-6",
                (stats?.lowStockItems || 0) > 0 ? "text-amber-600" : "text-gray-400"
              )} />
            </div>
          </div>
          {(stats?.lowStockItems || 0) > 0 && (
            <Link href="/pos/stock" className="mt-3 text-sm text-amber-600 hover:underline block">
              View items →
            </Link>
          )}
        </div>
      </div>

      {/* Quick Actions & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-gray-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl text-white transition-all hover:scale-105",
                  action.color
                )}
              >
                <action.icon className="h-8 w-8 mb-2" />
                <span className="font-semibold text-sm">{action.name}</span>
                <span className="text-xs opacity-75">{action.shortcut}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Payments</h3>
          <div className="space-y-3">
            {[
              { key: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-600 bg-green-100' },
              { key: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600 bg-blue-100' },
              { key: 'upi', label: 'UPI', icon: Smartphone, color: 'text-purple-600 bg-purple-100' },
            ].map(({ key, label, icon: Icon, color }) => {
              const amount = stats?.paymentBreakdown?.[key as keyof typeof stats.paymentBreakdown] || 0
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                  <span className="font-semibold">₹{amount.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions & Active Session */}
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
            <div className="text-center py-8 text-gray-400">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No transactions today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentTransactions.slice(0, 5).map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors active:bg-gray-200">
                  <div>
                    <p className="font-mono text-sm font-semibold text-blue-600 mb-0.5">{tx.receiptNumber}</p>
                    <p className="text-xs text-gray-500">{tx.time} • {tx.paymentMethod}</p>
                  </div>
                  <span className="font-bold text-gray-900">₹{tx.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Session */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-500" />
            Current Shift
          </h3>
          {stats?.activeSession ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                  <PlayCircle className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{stats.activeSession.sessionNumber}</p>
                  <p className="text-sm text-gray-500">
                    Started at {format(new Date(stats.activeSession.openedAt), 'HH:mm')}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Shift Sales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{stats.activeSession.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Link
                href="/pos/sessions"
                className="block w-full py-2 text-center border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Manage Session
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 mb-4">No active shift</p>
              <Link
                href="/pos/sessions"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlayCircle className="h-4 w-4" />
                Open Shift
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
