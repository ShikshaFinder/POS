'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import {
  ShoppingCart, Package, DollarSign, Users,
  Clock, Receipt, BarChart3, TrendingUp,
  Smartphone, CreditCard, Banknote, Settings,
  Store, FileText, Tag, AlertCircle, Shield,
  Zap, Download, RefreshCw, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function POSHomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState(new Date())

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Redirect logged-in users to checkout page
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/pos/checkout')
    }
  }, [status, session, router])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    // PWA Install Prompt Capture
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      clearInterval(timer)
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
    }
  }

  const features = [
    {
      name: 'Billing & Sales',
      description: 'Fast and efficient checkout process with barcode scanning and quick product search',
      icon: ShoppingCart,
      color: 'bg-blue-600',
      details: ['Quick billing', 'Barcode scanning', 'Cart management', 'Custom discounts']
    },
    {
      name: 'Shift Management',
      description: 'Track cashier shifts with opening and closing balances for accountability',
      icon: Clock,
      color: 'bg-green-600',
      details: ['Open/Close shifts', 'Cash tracking', 'Multiple cashiers', 'Shift reports']
    },
    {
      name: 'Receipt Management',
      description: 'View, search, and manage all transaction receipts with return/exchange support',
      icon: Receipt,
      color: 'bg-purple-600',
      details: ['Receipt history', 'Returns/Exchanges', 'Reprint receipts', 'Transaction search']
    },
    {
      name: 'Inventory Control',
      description: 'Real-time stock tracking with low stock alerts and product management',
      icon: Package,
      color: 'bg-orange-600',
      details: ['Stock tracking', 'Low stock alerts', 'Product catalog', 'Barcode generation']
    },
    {
      name: 'Payment Methods',
      description: 'Accept multiple payment methods including cash, card, UPI, and digital wallets',
      icon: CreditCard,
      color: 'bg-indigo-600',
      details: ['Cash payments', 'Card payments', 'UPI/Digital wallets', 'Split payments']
    },
    {
      name: 'Customer Management',
      description: 'Maintain customer database with purchase history and loyalty tracking',
      icon: Users,
      color: 'bg-pink-600',
      details: ['Customer profiles', 'Purchase history', 'Loyalty programs', 'Credit management']
    },
    {
      name: 'Sales Reports',
      description: 'Comprehensive analytics and reports for business insights',
      icon: BarChart3,
      color: 'bg-amber-600',
      details: ['Sales analytics', 'Daily/Monthly reports', 'Payment breakdown', 'Top products']
    },
    {
      name: 'Multi-Store Support',
      description: 'Manage multiple store locations from a single platform',
      icon: Store,
      color: 'bg-teal-600',
      details: ['Multiple locations', 'Centralized inventory', 'Store-wise reports', 'Stock transfer']
    }
  ]

  const additionalFeatures = [
    { name: 'Discount Management', icon: Tag },
    { name: 'Tax Configuration', icon: FileText },
    { name: 'User Permissions', icon: Shield },
    { name: 'Quick Search', icon: Search },
    { name: 'Data Backup', icon: Download },
    { name: 'Real-time Sync', icon: RefreshCw },
    { name: 'Fast Performance', icon: Zap },
    { name: 'Offline Mode', icon: AlertCircle }
  ]

  // Show loading state while checking auth or redirecting
  if (status === 'loading' || (status === 'authenticated' && session)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Store className="h-10 w-10 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 overflow-y-auto h-screen">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Store className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Flavi POS
                </h1>
                <p className="text-sm text-gray-600 font-medium">Complete Point of Sale Solution</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900 font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-sm text-gray-500">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              Modern POS System
            </div>
            <h2 className="text-5xl font-bold text-gray-900 leading-tight">
              Everything You Need to<br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Run Your Business
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamline your retail operations with our comprehensive point of sale system.
              Fast, reliable, and packed with features to help you succeed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <Link
                href={session ? "/pos" : "/signin"}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Store className="h-5 w-5" />
                Get Started
              </Link>

              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-gray-800 transition-colors inline-flex items-center gap-2 animate-bounce-subtle"
                >
                  <Download className="h-5 w-5" />
                  Install App
                </button>
              )}

              <Link
                href="/pos/products"
                className="px-6 py-3 bg-white text-gray-700 rounded-xl font-semibold text-lg shadow-lg hover:bg-gray-50 transition-colors border border-gray-200 inline-flex items-center gap-2"
              >
                <Package className="h-5 w-5" />
                View Products
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Billing Speed', value: '< 30 sec', icon: Zap, color: 'text-yellow-600' },
              { label: 'Payment Methods', value: '4+', icon: CreditCard, color: 'text-blue-600' },
              { label: 'Report Types', value: '10+', icon: BarChart3, color: 'text-green-600' },
              { label: 'User Roles', value: 'Multi', icon: Users, color: 'text-purple-600' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                <stat.icon className={cn("h-8 w-8 mx-auto mb-3", stat.color)} />
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Main Features Grid */}
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Core Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-xl transition-all hover:scale-105 group"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
                    feature.color
                  )}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">{feature.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Features */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Additional Capabilities</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {additionalFeatures.map((feature) => (
                <div key={feature.name} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <feature.icon className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">{feature.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white shadow-xl">
            <TrendingUp className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h3 className="text-4xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Access the dashboard to start managing your business operations
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href={session ? "/pos" : "/signin"}
                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold text-lg shadow-lg hover:bg-gray-50 transition-colors cursor-pointer inline-block"
              >
                → Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500 text-sm">
          <p>© 2026 Flavi POS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
