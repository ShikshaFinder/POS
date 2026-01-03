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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {/* All Tab */}
            <button
                onClick={() => onCategoryChange(null)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    selectedCategory === null
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
            >
                All
                <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
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
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                        selectedCategory === category.id
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                >
                    {category.name}
                    <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
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
