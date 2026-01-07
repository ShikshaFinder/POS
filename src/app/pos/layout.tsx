'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { ReactNode, useEffect } from 'react'
import { POSNav } from '@/components/pos/POSNav'
import { POSHeader } from '@/components/pos/POSHeader'
import { ConflictResolutionModal } from '@/components/pos/ConflictResolutionModal'
import { PWAInstallPrompt } from '@/components/pos/PWAInstallPrompt'
import { KeyboardShortcutsDialog } from '@/components/pos/KeyboardShortcutsDialog'
import { syncManager } from '@/lib/syncManager'

export default function POSLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()

  // Initialize sync manager and PWA
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }

    // Prevent window close during active sync
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncManager.isSyncInProgress()) {
        e.preventDefault()
        e.returnValue = 'Transactions are being synced. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/signin')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar Navigation */}
      <POSNav />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <POSHeader />
        
        {/* Page Content - Add padding for mobile bottom nav */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />
    </div>
  )
}
