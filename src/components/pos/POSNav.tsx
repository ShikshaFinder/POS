'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings,
  Receipt,
  TrendingUp,
  Users,
  Box,
  Menu,
  X
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/pos', icon: LayoutDashboard },
  { name: 'Checkout', href: '/pos/checkout', icon: ShoppingCart },
  { name: 'Products', href: '/pos/products', icon: Box },
  { name: 'Stock', href: '/pos/stock', icon: Package },
  { name: 'Customers', href: '/pos/customers', icon: Users },
  { name: 'Today\'s Sales', href: '/pos/sales', icon: TrendingUp },
  { name: 'Reports', href: '/pos/reports', icon: BarChart3 },
  { name: 'Receipts', href: '/pos/receipts', icon: Receipt },
  { name: 'Settings', href: '/pos/settings', icon: Settings },
]

export function POSNav() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-lg bg-white border border-gray-200 shadow-lg hover:bg-gray-50 transition-all tap-target touch-feedback"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-700" />
          ) : (
            <Menu className="h-6 w-6 text-gray-700" />
          )}
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar / Mobile Drawer */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          flex w-72 sm:w-80 flex-col bg-white border-r border-gray-200 shadow-2xl lg:shadow-none
          transition-transform duration-300 ease-out
          ${isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
          safe-top safe-bottom
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex h-16 sm:h-20 items-center px-4 sm:px-6 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold text-blue-600">Flavi POS</h1>
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="ml-auto p-2 hover:bg-gray-100 rounded-lg tap-target"
              aria-label="Close menu"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 sm:px-4 py-3 text-sm sm:text-base font-medium rounded-lg
                  transition-all duration-150 tap-target touch-feedback
                  ${isActive
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <p className="text-xs text-center text-gray-500">
            Flavi POS © 2026
          </p>
        </div>
      </aside>
    </>
  )
}
