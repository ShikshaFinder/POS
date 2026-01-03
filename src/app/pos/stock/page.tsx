'use client'

import { useEffect, useState } from 'react'
import { Package, AlertTriangle, TrendingDown, Search } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage your inventory
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{stocks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Low Stock</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stocks.filter(s => s.quantity > 0 && s.quantity <= s.product.reorderLevel).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Out of Stock</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stocks.filter(s => s.quantity === 0).length}
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
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'low'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Low Stock
          </button>
          <button
            onClick={() => setFilter('out')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'out'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
