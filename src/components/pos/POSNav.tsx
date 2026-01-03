'use client'

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
  Box
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

  return (
    <div className="flex w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">Flavi POS</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg
                transition-colors duration-150
                ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-center text-gray-500">
          Flavi POS © 2026
        </p>
      </div>
    </div>
  )
}
