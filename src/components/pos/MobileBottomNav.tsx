'use client'

import { ShoppingCart, Search, FileText, Menu, Home } from 'lucide-react'
import { useState, useEffect } from 'react'

interface MobileBottomNavProps {
    cartItemCount: number
    onCartClick: () => void
    onSearchClick: () => void
    onHeldBillsClick: () => void
    onMenuClick: () => void
}

export function MobileBottomNav({
    cartItemCount,
    onCartClick,
    onSearchClick,
    onHeldBillsClick,
    onMenuClick
}: MobileBottomNavProps) {
    const [isVisible, setIsVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)

    // Auto-hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY

            if (currentScrollY < 50) {
                setIsVisible(true)
            } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                setIsVisible(false)
            } else if (currentScrollY < lastScrollY) {
                // Scrolling up
                setIsVisible(true)
            }

            setLastScrollY(currentScrollY)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY])

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-2xl safe-bottom"
            role="navigation"
            aria-label="Mobile bottom navigation"
        >
            <div className="flex items-center justify-around px-2 py-2 pb-safe">
                {/* Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center tap-target-lg touch-feedback rounded-lg hover:bg-gray-100 px-3"
                    aria-label="Menu"
                >
                    <Menu className="h-6 w-6 text-gray-600" aria-hidden="true" />
                    <span className="text-[10px] text-gray-600 mt-0.5">Menu</span>
                </button>

                {/* Search Button */}
                <button
                    onClick={onSearchClick}
                    className="flex flex-col items-center justify-center tap-target-lg touch-feedback rounded-lg hover:bg-gray-100 px-3"
                    aria-label="Search products"
                >
                    <Search className="h-6 w-6 text-gray-600" aria-hidden="true" />
                    <span className="text-[10px] text-gray-600 mt-0.5">Search</span>
                </button>

                {/* Cart Button */}
                <button
                    onClick={onCartClick}
                    className="relative flex flex-col items-center justify-center tap-target-lg touch-feedback rounded-lg hover:bg-gray-100 px-3"
                    aria-label={`View cart with ${cartItemCount} items`}
                >
                    <div className="relative">
                        <ShoppingCart
                            className={`h-6 w-6 ${cartItemCount > 0 ? 'text-blue-600' : 'text-gray-600'}`}
                            aria-hidden="true"
                        />
                        {cartItemCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                                {cartItemCount > 9 ? '9+' : cartItemCount}
                            </span>
                        )}
                    </div>
                    <span className={`text-[10px] mt-0.5 ${cartItemCount > 0 ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                        Cart
                    </span>
                </button>

                {/* Held Bills Button */}
                <button
                    onClick={onHeldBillsClick}
                    className="flex flex-col items-center justify-center tap-target-lg touch-feedback rounded-lg hover:bg-gray-100 px-3"
                    aria-label="View held bills"
                >
                    <FileText className="h-6 w-6 text-gray-600" aria-hidden="true" />
                    <span className="text-[10px] text-gray-600 mt-0.5">Held</span>
                </button>
            </div>
        </nav>
    )
}
