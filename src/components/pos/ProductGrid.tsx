'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, AlertTriangle, Package, Grid, List } from 'lucide-react'

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
    searchInputRef?: React.RefObject<HTMLInputElement | null>
}

export default function ProductGrid({
    products,
    searchQuery,
    onSearchChange,
    onProductClick,
    loading = false,
    searchInputRef
}: ProductGridProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    
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
            {/* Search Bar with View Toggle */}
            <div className="relative mb-3 sm:mb-4 flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm tap-target no-zoom-on-focus"
                        autoComplete="off"
                        aria-label="Search products"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hidden md:block">
                        F2 to focus
                    </div>
                </div>
                {/* View Mode Toggle - Hidden on mobile */}
                <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-lg" role="group" aria-label="View mode">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded transition-all touch-feedback ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                        aria-label="Grid view"
                        aria-pressed={viewMode === 'grid'}
                    >
                        <Grid className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded transition-all touch-feedback ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                        aria-label="List view"
                        aria-pressed={viewMode === 'list'}
                    >
                        <List className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Products Grid/List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className={viewMode === 'grid' 
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3"
                        : "space-y-2"
                    }>
                        {[...Array(10)].map((_, i) => (
                            <div 
                                key={i} 
                                className={viewMode === 'grid' 
                                    ? "bg-gray-100 rounded-lg h-44 sm:h-48 animate-pulse"
                                    : "bg-gray-100 rounded-lg h-20 animate-pulse"
                                } 
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400" role="status">
                        <Package className="h-12 w-12 mb-2" aria-hidden="true" />
                        <p className="text-sm">No products found</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div 
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 pb-2"
                        role="list"
                        aria-label="Products"
                    >
                        {products.map((product) => {
                            const stockStatus = getStockStatus(product)
                            const discount = getDiscountPercent(product)
                            const isDisabled = stockStatus.status === 'out'

                            return (
                                <article
                                    key={product.id}
                                    onClick={() => !isDisabled && onProductClick(product)}
                                    className={`
                                        relative bg-white border rounded-lg overflow-hidden transition-all mobile-card touch-feedback
                                        ${isDisabled
                                            ? 'opacity-60 cursor-not-allowed border-gray-200'
                                            : 'cursor-pointer hover:border-blue-400 border-gray-200'
                                        }
                                    `}
                                    role="listitem"
                                    tabIndex={isDisabled ? -1 : 0}
                                    aria-label={`${product.name}, ${product.unitPrice ? `Price: ${product.unitPrice} rupees` : 'Price not set'}, ${stockStatus.label}`}
                                    onKeyDown={(e) => {
                                        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                                            e.preventDefault()
                                            onProductClick(product)
                                        }
                                    }}
                                >
                                    {/* Discount Badge */}
                                    {discount > 0 && (
                                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full z-10 shadow-lg">
                                            {discount}% OFF
                                        </div>
                                    )}

                                    {/* Product Image */}
                                    <div className="relative w-full aspect-square bg-gray-100">
                                        {product.imageUrl ? (
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Package className="h-8 sm:h-12 w-8 sm:w-12 text-gray-300" aria-hidden="true" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-2 sm:p-3 space-y-1">
                                        <h3 className="font-medium text-xs sm:text-sm text-gray-900 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">
                                            {product.name}
                                        </h3>

                                        {/* Price */}
                                        <div className="flex items-baseline gap-1 flex-wrap">
                                            <span className="text-sm sm:text-lg font-bold text-gray-900">
                                                ₹{product.unitPrice?.toFixed(2) || 'N/A'}
                                            </span>
                                            {product.markedPrice && product.markedPrice > (product.unitPrice || 0) && (
                                                <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                                                    ₹{product.markedPrice.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Stock Status */}
                                        <div className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border ${stockStatus.color} text-center`}>
                                            <span className="font-medium">{stockStatus.label}</span>
                                            {stockStatus.status !== 'out' && (
                                                <span className="ml-1 hidden xs:inline">({product.currentStock})</span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-2" role="list" aria-label="Products">
                        {products.map((product) => {
                            const stockStatus = getStockStatus(product)
                            const discount = getDiscountPercent(product)
                            const isDisabled = stockStatus.status === 'out'

                            return (
                                <article
                                    key={product.id}
                                    onClick={() => !isDisabled && onProductClick(product)}
                                    className={`
                                        relative bg-white border rounded-lg p-3 transition-all flex gap-3
                                        ${isDisabled
                                            ? 'opacity-60 cursor-not-allowed border-gray-200'
                                            : 'cursor-pointer hover:shadow-lg hover:border-blue-400 border-gray-200'
                                        }
                                    `}
                                    role="listitem"
                                    tabIndex={isDisabled ? -1 : 0}
                                    aria-label={`${product.name}, ${product.unitPrice ? `Price: ${product.unitPrice} rupees` : 'Price not set'}, ${stockStatus.label}`}
                                    onKeyDown={(e) => {
                                        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                                            e.preventDefault()
                                            onProductClick(product)
                                        }
                                    }}
                                >
                                    {/* Product Image */}
                                    <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                        {product.imageUrl ? (
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                unoptimized
                                                className="object-cover"
                                                sizes="80px"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Package className="h-8 w-8 text-gray-300" aria-hidden="true" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">
                                            {product.name}
                                        </h3>
                                        
                                        <div className="flex items-baseline gap-2 mb-2">
                                            <span className="text-lg font-bold text-gray-900">
                                                ₹{product.unitPrice?.toFixed(2) || 'N/A'}
                                            </span>
                                            {product.markedPrice && product.markedPrice > (product.unitPrice || 0) && (
                                                <>
                                                    <span className="text-sm text-gray-400 line-through">
                                                        ₹{product.markedPrice.toFixed(2)}
                                                    </span>
                                                    <span className="text-xs font-bold text-red-600">
                                                        {discount}% OFF
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        <div className={`inline-block text-xs px-2 py-1 rounded border ${stockStatus.color}`}>
                                            <span className="font-medium">{stockStatus.label}</span>
                                            {stockStatus.status !== 'out' && (
                                                <span className="ml-1">({product.currentStock} {product.unit})</span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
