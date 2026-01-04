'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart,
  Banknote, CreditCard, Smartphone, Wallet,
  Calendar, ChevronLeft, ChevronRight, Users,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DailyReport {
  date: string
  summary: {
    totalSales: number
    totalTransactions: number
    totalDiscount: number
    totalTax: number
    averageTicket: number
  }
  paymentBreakdown: {
    cash: number
    card: number
    upi: number
    wallet: number
    split: number
  }
  hourlyBreakdown: { hour: number; sales: number; transactions: number }[]
  topProducts: { productId: string; name: string; quantity: number; revenue: number }[]
  cashiers: { cashierId: string; name: string; sales: number; transactions: number }[]
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/pos/reports/daily?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const changeDate = (offset: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + offset)
    setSelectedDate(date.toISOString().slice(0, 10))
  }

  const maxHourlySales = report
    ? Math.max(...report.hourlyBreakdown.map(h => h.sales), 1)
    : 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Daily Sales Report
        </h1>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 focus:ring-0 text-sm font-medium"
            />
          </div>
          <button
            onClick={() => changeDate(1)}
            disabled={selectedDate === new Date().toISOString().slice(0, 10)}
            className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading report...</div>
      ) : !report ? (
        <div className="text-center py-12 text-gray-500">No data available</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{report.summary.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{report.summary.totalTransactions}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg. Ticket</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{report.summary.averageTicket.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Discount</p>
                  <p className="text-2xl font-bold text-red-600">
                    -₹{report.summary.totalDiscount.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
              <div className="space-y-4">
                {[
                  { key: 'cash', label: 'Cash', icon: Banknote, color: 'green' },
                  { key: 'card', label: 'Card', icon: CreditCard, color: 'blue' },
                  { key: 'upi', label: 'UPI', icon: Smartphone, color: 'purple' },
                  { key: 'wallet', label: 'Wallet', icon: Wallet, color: 'orange' }
                ].map(({ key, label, icon: Icon, color }) => {
                  const amount = report.paymentBreakdown[key as keyof typeof report.paymentBreakdown]
                  const percentage = report.summary.totalSales > 0
                    ? (amount / report.summary.totalSales) * 100
                    : 0
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 text-${color}-600`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{label}</span>
                          <span>₹{amount.toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${color}-500 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 w-12 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Products
              </h3>
              {report.topProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">No product sales today</p>
              ) : (
                <div className="space-y-3">
                  {report.topProducts.slice(0, 5).map((product, idx) => (
                    <div key={product.productId} className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-4">{idx + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} sold</p>
                      </div>
                      <span className="font-semibold text-sm">₹{product.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hourly Sales Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Sales</h3>
            <div className="flex items-end gap-1 h-40">
              {report.hourlyBreakdown.map((hour) => (
                <div
                  key={hour.hour}
                  className="flex-1 flex flex-col items-center group"
                >
                  <div
                    className={cn(
                      "w-full rounded-t transition-all cursor-pointer",
                      hour.sales > 0 ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-100"
                    )}
                    style={{ height: `${(hour.sales / maxHourlySales) * 100}%`, minHeight: hour.sales > 0 ? '4px' : '2px' }}
                    title={`${hour.hour}:00 - ₹${hour.sales.toFixed(2)} (${hour.transactions} txns)`}
                  />
                  <span className="text-[10px] text-gray-400 mt-1">
                    {hour.hour.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cashier Performance */}
          {report.cashiers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Cashier Performance
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Cashier</th>
                    <th className="text-right py-2 font-medium text-gray-600">Transactions</th>
                    <th className="text-right py-2 font-medium text-gray-600">Sales</th>
                    <th className="text-right py-2 font-medium text-gray-600">Avg. Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {report.cashiers.map((cashier) => (
                    <tr key={cashier.cashierId} className="border-b border-gray-100">
                      <td className="py-2 font-medium">{cashier.name}</td>
                      <td className="py-2 text-right">{cashier.transactions}</td>
                      <td className="py-2 text-right font-semibold">₹{cashier.sales.toFixed(2)}</td>
                      <td className="py-2 text-right text-gray-600">
                        ₹{(cashier.sales / cashier.transactions).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
