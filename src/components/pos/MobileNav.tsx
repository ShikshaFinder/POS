'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Receipt, Menu } from 'lucide-react'

interface MobileNavProps {
    onMenuClick: () => void
    isMenuOpen: boolean
}

export function MobileNav({ onMenuClick, isMenuOpen }: MobileNavProps) {
    const pathname = usePathname()

    const navItems = [
        { name: 'Home', href: '/pos', icon: LayoutDashboard },
        { name: 'Checkout', href: '/pos/checkout', icon: ShoppingCart },
        { name: 'Receipts', href: '/pos/receipts', icon: Receipt },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-bottom bg-white border-t border-gray-200 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)]">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`
                flex flex-col items-center justify-center w-full h-full space-y-1
                transition-colors duration-200 tap-target
                ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}
              `}
                        >
                            <item.icon
                                className={`w-6 h-6 ${isActive ? 'fill-current opacity-20 stroke-[2.5px]' : 'stroke-2'}`}
                            />
                            <span className="text-[10px] font-medium tracking-wide">{item.name}</span>
                            {isActive && (
                                <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+2px)] w-1 h-1 rounded-full bg-blue-600" />
                            )}
                        </Link>
                    )
                })}

                <button
                    onClick={onMenuClick}
                    className={`
            flex flex-col items-center justify-center w-full h-full space-y-1
            transition-colors duration-200 tap-target
            ${isMenuOpen ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}
          `}
                    aria-label="Menu"
                    aria-expanded={isMenuOpen}
                >
                    <Menu className="w-6 h-6 stroke-2" />
                    <span className="text-[10px] font-medium tracking-wide">Menu</span>
                </button>
            </div>
        </div>
    )
}
