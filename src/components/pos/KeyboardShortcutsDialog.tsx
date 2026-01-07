'use client'

import { useState, useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcut {
  key: string
  description: string
  category: 'Navigation' | 'Cart' | 'Actions' | 'General'
}

const shortcuts: KeyboardShortcut[] = [
  // Navigation
  { key: 'F2', description: 'Focus search bar', category: 'Navigation' },
  { key: 'Tab', description: 'Move to next element', category: 'Navigation' },
  { key: 'Shift + Tab', description: 'Move to previous element', category: 'Navigation' },
  { key: 'Escape', description: 'Close modals/dialogs', category: 'Navigation' },
  
  // Cart Actions
  { key: 'F5', description: 'Hold current bill', category: 'Cart' },
  { key: 'F12', description: 'Proceed to payment', category: 'Cart' },
  { key: 'Alt + C', description: 'Clear cart', category: 'Cart' },
  { key: 'Alt + D', description: 'Add discount', category: 'Cart' },
  
  // Actions
  { key: 'Alt + Q', description: 'Quick search products', category: 'Actions' },
  { key: 'Alt + A', description: 'Add item', category: 'Actions' },
  { key: 'Alt + H', description: 'Hold bill', category: 'Actions' },
  { key: 'Alt + B', description: 'View held bills', category: 'Actions' },
  { key: 'Alt + P', description: 'Payment', category: 'Actions' },
  
  // General
  { key: 'Enter', description: 'Confirm/Select', category: 'General' },
  { key: 'Space', description: 'Activate button', category: 'General' },
  { key: 'Ctrl + /', description: 'Show keyboard shortcuts', category: 'General' },
]

export function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + / to toggle shortcuts dialog
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-all hidden lg:flex items-center gap-2"
        aria-label="Show keyboard shortcuts"
        title="Show keyboard shortcuts (Ctrl + /)"
      >
        <Keyboard className="h-5 w-5" aria-hidden="true" />
        <span className="text-xs font-medium">Shortcuts</span>
      </button>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <h2 id="shortcuts-title" className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Keyboard className="h-6 w-6 text-blue-600" aria-hidden="true" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Close shortcuts dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          <p className="text-sm text-gray-600 mb-6">
            Use these keyboard shortcuts to navigate and work faster in the POS system.
          </p>

          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span className="text-sm text-gray-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 text-xs font-mono font-semibold bg-gray-100 text-gray-800 border border-gray-300 rounded-md shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-2 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded">Ctrl</kbd> + 
            <kbd className="px-2 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded ml-1">/</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </>
  )
}
