'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, AlertTriangle, Package } from 'lucide-react'

interface Product {
    id: string
    name: string
    sku: string | null
    unitPrice: number | null
    markedPrice: number | null
    currentStock: number | null
    reorderLevel: number | null
    unit: string
    category: string
    categoryId: string | null
    imageUrl: string | null
}

interface ProductGridProps {
    products: Product[]
    searchQuery: string
    onSearchChange: (query: string) => void
    onProductClick: (product: Product) => void
    loading?: boolean
}

export default function ProductGrid({
    products,
    searchQuery,
    onSearchChange,
    onProductClick,
    loading = false
}: ProductGridProps) {
    const getStockStatus = (product: Product) => {
        const stock = product.currentStock ?? 0
        const reorder = product.reorderLevel ?? 0

        if (stock === 0) return { status: 'out', label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' }
        if (stock <= reorder) return { status: 'low', label: 'Low Stock', color: 'bg-amber-100 text-amber-700 border-amber-200' }
        return { status: 'ok', label: 'In Stock', color: 'bg-green-100 text-green-700 border-green-200' }
    }

    const getDiscountPercent = (product: Product) => {
        if (!product.markedPrice || !product.unitPrice) return 0
        if (product.markedPrice <= product.unitPrice) return 0
        return Math.round(((product.markedPrice - product.unitPrice) / product.markedPrice) * 100)
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, SKU, or barcode..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    F2 to focus
                </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-lg h-48 animate-pulse" />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Package className="h-12 w-12 mb-2" />
                        <p className="text-sm">No products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {products.map((product) => {
                            const stockStatus = getStockStatus(product)
                            const discount = getDiscountPercent(product)
                            const isDisabled = stockStatus.status === 'out'

                            return (
                                <div
                                    key={product.id}
                                    onClick={() => !isDisabled && onProductClick(product)}
                                    className={`
                    relative bg-white border rounded-lg overflow-hidden transition-all
                    ${isDisabled
                                            ? 'opacity-60 cursor-not-allowed border-gray-200'
                                            : 'cursor-pointer hover:shadow-lg hover:border-blue-400 border-gray-200'
                                        }
                  `}
                                >
                                    {/* Discount Badge */}
                                    {discount > 0 && (
                                        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                            {discount}% OFF
                                        </div>
                                    )}

                                    {/* Stock Warning Badge */}
                                    {stockStatus.status === 'low' && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        </div>
                                    )}

                                    {/* Product Image */}
                                    <div className="relative h-24 bg-gray-50">
                                        {product.imageUrl ? (
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 50vw, 20vw"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Package className="h-8 w-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-3">
                                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                                            {product.name}
                                        </h3>

                                        {product.sku && (
                                            <p className="text-xs text-gray-400 mt-0.5">{product.sku}</p>
                                        )}

                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-base font-semibold text-gray-900">
                                                ₹{(product.unitPrice ?? 0).toFixed(2)}
                                            </span>
                                            {product.markedPrice && product.markedPrice > (product.unitPrice ?? 0) && (
                                                <span className="text-xs text-gray-400 line-through">
                                                    ₹{product.markedPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2 flex items-center justify-between">
                                            <span className={`text-xs px-1.5 py-0.5 rounded border ${stockStatus.color}`}>
                                                {product.currentStock ?? 0} {product.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
