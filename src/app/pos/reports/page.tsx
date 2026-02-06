'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, TrendingUp, DollarSign, ShoppingCart,
  Banknote, CreditCard, Smartphone, Wallet,
  Calendar, ChevronLeft, ChevronRight, Users,
  Package, RefreshCw, AlertCircle
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
  // Use LOCAL timezone for initial date to avoid UTC mismatch
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
  })

  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/pos/reports/daily?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      } else {
        setError('Failed to load data')
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
      setError('Connection error')
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
    setSelectedDate(date.toLocaleDateString('en-CA'))
  }

  const maxHourlySales = report?.hourlyBreakdown.length
    ? Math.max(...report.hourlyBreakdown.map(h => h.sales), 1)
    : 1

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Daily Sales Report
          </h1>
          <p className="text-sm text-gray-500 mt-1 ml-8">
            Overview of your store's performance
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm flex-1 sm:flex-initial justify-between sm:justify-start">
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
                className="border-0 focus:ring-0 text-sm font-medium bg-transparent p-0 w-[110px]"
              />
            </div>
            <button
              onClick={() => changeDate(1)}
              // Allow looking at future dates if needed, or disable:
              // disabled={selectedDate >= new Date().toLocaleDateString('en-CA')}
              className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        // Skeleton Loading State
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl"></div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
          <p className="font-medium text-red-700">{error}</p>
          <button onClick={fetchReport} className="mt-4 text-sm text-red-600 underline hover:text-red-800">Try Again</button>
        </div>
      ) : !report ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          No data available for this date.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Sales"
              value={formatCurrency(report.summary.totalSales)}
              icon={Banknote}
              color="green"
              subtext="Gross Sales"
            />
            <SummaryCard
              title="Transactions"
              value={report.summary.totalTransactions.toString()}
              icon={ShoppingCart}
              color="blue"
              subtext="Total Orders"
            />
            <SummaryCard
              title="Avg. Ticket"
              value={formatCurrency(report.summary.averageTicket)}
              icon={TrendingUp}
              color="purple"
              subtext="Per Order"
            />
            <SummaryCard
              title="Total Discount"
              value={`-${formatCurrency(report.summary.totalDiscount)}`}
              icon={DollarSign}
              color="red"
              textColor="text-red-600"
              subtext="Given Away"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Payment Breakdown (Left) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-full">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-gray-500" />
                  Payment Methods
                </h3>
                <div className="space-y-6">
                  {[
                    { key: 'cash', label: 'Cash', icon: Banknote, color: 'green' },
                    { key: 'card', label: 'Card', icon: CreditCard, color: 'blue' },
                    { key: 'upi', label: 'UPI', icon: Smartphone, color: 'purple' },
                    { key: 'wallet', label: 'Wallet', icon: Wallet, color: 'orange' }
                  ].map(({ key, label, icon: Icon, color }) => {
                    const amount = report.paymentBreakdown[key as keyof typeof report.paymentBreakdown]
                    const total = report.summary.totalSales
                    const percentage = total > 0 ? (amount / total) * 100 : 0

                    return (
                      <div key={key} className="group">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg bg-${color}-50`}>
                            <Icon className={`h-4 w-4 text-${color}-600`} />
                          </div>
                          <span className="font-medium text-gray-700 flex-1">{label}</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded w-[45px] text-center">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>

                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${color}-500 rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Hourly Sales (Right) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-500" />
                  Hourly Sales Trend
                </h3>
                <div className="flex-1 min-h-[300px] flex items-end gap-2 pb-6 relative">
                  {report.hourlyBreakdown.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      No transaction data yet
                    </div>
                  ) : (
                    report.hourlyBreakdown.map((hour) => (
                      <div
                        key={hour.hour}
                        className="flex-1 flex flex-col items-center group relative h-full justify-end"
                      >
                        <div
                          className={cn(
                            "w-full max-w-[40px] rounded-t-lg transition-all cursor-crosshair opacity-80 group-hover:opacity-100",
                            hour.sales > 0 ? "bg-indigo-500 group-hover:bg-indigo-600" : "bg-gray-100"
                          )}
                          style={{
                            height: `${(hour.sales / maxHourlySales) * 100}%`,
                            minHeight: hour.sales > 0 ? '4px' : '0'
                          }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            <div className="font-bold">{hour.hour}:00 - {hour.hour + 1}:00</div>
                            <div>Sales: {formatCurrency(hour.sales)}</div>
                            <div>Txns: {hour.transactions}</div>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400 mt-2 font-medium">
                          {hour.hour}
                        </span>
                      </div>
                    ))
                  )}

                  {/* X-axis label */}
                  <div className="absolute bottom-[-10px] left-0 right-0 h-[1px] bg-gray-100" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-500" />
                Top Performing Products
              </h3>
              {report.topProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                  No product sales today
                </div>
              ) : (
                <div className="space-y-4">
                  {report.topProducts.slice(0, 5).map((product, idx) => (
                    <div key={product.productId} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} units sold</p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-gray-900">{formatCurrency(product.revenue)}</span>
                        <span className="text-xs text-gray-400">revenue</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cashier Performance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                Cashier Performance
              </h3>
              {report.cashiers.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                  No active cashiers
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-semibold text-gray-500 pl-2">Name</th>
                        <th className="text-right py-3 font-semibold text-gray-500">Orders</th>
                        <th className="text-right py-3 font-semibold text-gray-500">Avg</th>
                        <th className="text-right py-3 font-semibold text-gray-500 pr-2">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.cashiers.map((cashier) => (
                        <tr key={cashier.cashierId} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 font-medium text-gray-900 pl-2">{cashier.name}</td>
                          <td className="py-3 text-right text-gray-600">{cashier.transactions}</td>
                          <td className="py-3 text-right text-gray-600">
                            {formatCurrency(cashier.sales / (cashier.transactions || 1))}
                          </td>
                          <td className="py-3 text-right font-bold text-gray-900 pr-2">{formatCurrency(cashier.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ title, value, icon: Icon, color, textColor = 'text-gray-900', subtext }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full bg-${color}-50`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        {/* Optional: Add percentage growth here if available */}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className={cn("text-2xl font-bold tracking-tight", textColor)}>{value}</h3>
        {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      </div>
    </div>
  )
}
