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
  X,
  Download
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

interface POSNavProps {
  isOpen: boolean
  onClose: () => void
}

export function POSNav({ isOpen, onClose }: POSNavProps) {
  const pathname = usePathname()
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
    onClose()
  }, [pathname, onClose])

  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      // Fallback for iOS or if prompt not available
      alert("To install the app:\n\niOS: Tap 'Share' → 'Add to Home Screen'\nAndroid: Tap 'Menu' → 'Install App'")
    }
  }

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isMobile])

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden fade-in backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar / Mobile Drawer */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex w-72 sm:w-80 flex-col bg-white border-r border-gray-200 shadow-2xl lg:shadow-none
          transition-transform duration-300 ease-out
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
          safe-top safe-bottom
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex h-16 sm:h-20 items-center px-4 sm:px-6 border-b border-gray-200 flex-shrink-0 justify-between">
          <div className="flex items-center gap-3">
            {/* Use existing logo logic or text. Prompt says "Optimizing existing logo... Header and navigation bar". 
                 I'll insert the logo image here instead of just text if I can, but standard text is fine for now. 
                 Wait, I should update the logo to use the image as requested "Logo Usage & Optimization".
             */}
            <img src="/flavi-logo.png" alt="Flavi POS" className="w-8 h-8 rounded-lg object-contain" />
            <h1 className="text-xl sm:text-2xl font-bold text-blue-600 tracking-tight">Flavi POS</h1>
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg tap-target"
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
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            )
          })}

          {/* Install App Button */}
          {!isInstalled && (
            <button
              id="pwa-install-btn"
              onClick={handleInstallClick}
              className="flex w-full items-center gap-3 px-3 sm:px-4 py-3 text-sm sm:text-base font-medium rounded-lg text-blue-600 hover:bg-blue-50 transition-all tap-target touch-feedback mt-2"
            >
              <Download className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
              <span>Install App</span>
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0 bg-gray-50/50">
          <p className="text-xs text-center text-gray-500 font-medium">
            Flavi POS v2.0
          </p>
        </div>
      </aside>
    </>
  )
}
