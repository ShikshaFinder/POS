'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package, AlertTriangle, TrendingDown, Search, ClipboardCheck } from 'lucide-react'

interface StockItem {
  id: string
  product: {
    id: string
    name: string
    sku: string
    unit: string
    category: string
    reorderLevel: number
  }
  quantity: number
  storageLocation: {
    name: string
  }
}

export default function StockPage() {
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [allStocks, setAllStocks] = useState<StockItem[]>([]) // For stats calculation
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const searchParams = useSearchParams()
  const filterParam = searchParams.get('filter') as 'all' | 'low' | 'out' | null
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')

  useEffect(() => {
    if (filterParam && ['all', 'low', 'out'].includes(filterParam)) {
      setFilter(filterParam)
    }
  }, [filterParam])

  useEffect(() => {
    fetchStocks()
  }, [filter, searchQuery])

  const fetchStocks = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('filter', filter)
      if (searchQuery) params.append('search', searchQuery)

      const res = await fetch(`/api/pos/stock?${params}`)
      if (res.ok) {
        const data = await res.json()
        setStocks(data.stocks || [])

        // Also fetch all stocks for stats (without filters) if we don't have them yet or if search/filter changed
        if (filter === 'all' && !searchQuery) {
          setAllStocks(data.stocks || [])
        } else if (allStocks.length === 0) {
          // Fetch all stocks for stats
          const allRes = await fetch(`/api/pos/stock`)
          if (allRes.ok) {
            const allData = await allRes.json()
            setAllStocks(allData.stocks || [])
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch stocks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (quantity: number, reorderLevel: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'text-red-600 bg-red-100' }
    if (quantity <= reorderLevel) return { label: 'Low Stock', color: 'text-orange-600 bg-orange-100' }
    return { label: 'In Stock', color: 'text-green-600 bg-green-100' }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage your inventory
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <a
            href="/pos/stock/receive"
            className="flex-1 md:flex-none justify-center inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Package className="h-4 w-4" />
            Receive
          </a>
          <a
            href="/pos/stock/count"
            className="flex-1 md:flex-none justify-center inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            Daily Count
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="shrink-0">
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{allStocks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Low Stock</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allStocks.filter(s => s.quantity > 0 && s.quantity <= s.product.reorderLevel).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="shrink-0">
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Out of Stock</p>
              <p className="text-2xl font-semibold text-gray-900">
                {allStocks.filter(s => s.quantity === 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'low'
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setFilter('out')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'out'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Mobile Stock Cards */}
      <div className="md:hidden space-y-4 pb-32">
        {stocks.map((stock) => {
          const status = getStockStatus(stock.quantity, stock.product.reorderLevel)
          return (
            <div key={stock.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">{stock.product.name}</h3>
                  <p className="text-sm text-gray-500 break-all">{stock.product.sku}</p>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Category</p>
                  <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {stock.product.category}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                  <p className="font-medium text-gray-900 mt-1 truncate">{stock.storageLocation.name}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  Reorder Level: <span className="font-medium">{stock.product.reorderLevel}</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {stock.quantity} <span className="text-sm font-normal text-gray-500">{stock.product.unit}</span>
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {stocks.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No stock items found
          </div>
        )}
      </div>

      {/* Desktop Stock Table */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stocks.map((stock) => {
                const status = getStockStatus(stock.quantity, stock.product.reorderLevel)
                return (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {stock.product.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stock.product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {stock.product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stock.storageLocation.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="font-medium text-gray-900">
                        {stock.quantity} {stock.product.unit}
                      </span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Reorder: {stock.product.reorderLevel}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
