'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { ReactNode, useEffect, useState, useCallback } from 'react'
import { POSNav } from '@/components/pos/POSNav'
import { POSHeader } from '@/components/pos/POSHeader'
import { MobileNav } from '@/components/pos/MobileNav'
import { ConflictResolutionModal } from '@/components/pos/ConflictResolutionModal'
import { PWAInstallPrompt } from '@/components/pos/PWAInstallPrompt'
import { KeyboardShortcutsDialog } from '@/components/pos/KeyboardShortcutsDialog'
import { syncManager } from '@/lib/syncManager'
import { toast } from 'sonner'

export default function POSLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  // Initialize sync manager and PWA
  useEffect(() => {
    // Register service worker is handled by next-pwa now.
    // We can keep specific logic here if needed, but for now we'll let next-pwa handle registration.

    // Legacy registration - keeping it safe or removing if redundant.
    // Let's rely on next-pwa but keep the event listeners.

    // Prevent window close during active sync
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncManager.isSyncInProgress()) {
        e.preventDefault()
        e.returnValue = 'Transactions are being synced. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    // Listen for sync events to show toasts
    const handleSyncSuccess = (e: CustomEvent) => {
      toast.success('Transaction synced!', {
        description: `Server ID: ${e.detail.serverId?.substring(0, 8) || 'N/A'}`,
        duration: 2000,
      })
    }

    const handleSyncFailed = (e: CustomEvent) => {
      if (e.detail.permanent) {
        toast.error('Sync failed', {
          description: e.detail.error || 'Transaction failed to sync after multiple attempts',
          duration: 5000,
        })
      }
    }

    const handleValidationError = (e: CustomEvent) => {
      toast.error('Product validation failed', {
        description: e.detail.message,
        duration: 5000,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('transaction-synced', handleSyncSuccess as EventListener)
    window.addEventListener('transaction-sync-failed', handleSyncFailed as EventListener)
    window.addEventListener('transaction-validation-error', handleValidationError as EventListener)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('transaction-synced', handleSyncSuccess as EventListener)
      window.removeEventListener('transaction-sync-failed', handleSyncFailed as EventListener)
      window.removeEventListener('transaction-validation-error', handleValidationError as EventListener)
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
      <POSNav isOpen={mobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <POSHeader />

        {/* Page Content - Add padding for mobile bottom nav and proper spacing */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-32 lg:pb-6 custom-scrollbar safe-bottom">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        onMenuClick={() => setMobileMenuOpen(true)}
        isMenuOpen={mobileMenuOpen}
      />

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />
    </div>
  )
}
