'use client'

import { cn } from '@/lib/utils'

interface Category {
    id: string
    name: string
    productCount: number
}

interface CategoryTabsProps {
    categories: Category[]
    selectedCategory: string | null
    onCategoryChange: (categoryId: string | null) => void
}

export default function CategoryTabs({
    categories,
    selectedCategory,
    onCategoryChange
}: CategoryTabsProps) {
    const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0)

    return (
        <div className="flex items-center gap-x-3 gap-y-2 flex-wrap pb-2" role="tablist" aria-label="Product categories">
            {/* All Tab */}
            <button
                onClick={() => onCategoryChange(null)}
                role="tab"
                aria-selected={selectedCategory === null}
                aria-label={`All products, ${totalProducts} items`}
                className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-feedback tap-target",
                    selectedCategory === null
                        ? "bg-blue-600 text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                )}
            >
                All
                <span className={cn(
                    "text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-semibold",
                    selectedCategory === null
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-600"
                )}>
                    {totalProducts}
                </span>
            </button>

            {/* Category Tabs */}
            {categories.map((category) => (
                <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    role="tab"
                    aria-selected={selectedCategory === category.id}
                    aria-label={`${category.name}, ${category.productCount} items`}
                    className={cn(
                        "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-feedback tap-target",
                        selectedCategory === category.id
                            ? "bg-blue-600 text-white shadow-md scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                    )}
                >
                    {category.name}
                    <span className={cn(
                        "text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-semibold",
                        selectedCategory === category.id
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-600"
                    )}>
                        {category.productCount}
                    </span>
                </button>
            ))}
        </div>
    )
}
