import { Keyboard } from 'lucide-react'

interface ShortcutKey {
  key: string
  description: string
}

interface ShortcutCategory {
  category: string
  shortcuts: ShortcutKey[]
}

const shortcuts: ShortcutCategory[] = [
  {
    category: 'Billing',
    shortcuts: [
      { key: 'Alt + Q', description: 'Search products' },
      { key: 'Alt + A', description: 'Add item (focus search)' },
      { key: 'Alt + H', description: 'Hold current bill' },
      { key: 'Alt + B', description: 'View held bills' },
      { key: 'Alt + P', description: 'Open payment modal' },
      { key: 'Alt + C', description: 'Clear cart' },
      { key: 'Esc', description: 'Close modals' },
    ],
  },
  {
    category: 'Payment',
    shortcuts: [
      { key: 'Alt + C', description: 'Select Cash payment' },
      { key: 'Alt + D', description: 'Select Card payment' },
      { key: 'Alt + U', description: 'Select UPI payment' },
      { key: 'Alt + W', description: 'Select Wallet payment' },
      { key: 'Enter', description: 'Confirm payment' },
      { key: 'Esc', description: 'Cancel payment' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { key: 'Alt + N', description: 'New Sale' },
      { key: 'Alt + S', description: 'Sessions' },
      { key: 'Alt + R', description: 'Receipts' },
      { key: 'Alt + T', description: 'Reports' },
    ],
  },
]

export default function KeyboardShortcutsReference() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Keyboard className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
      </div>
      
      <div className="space-y-4">
        {shortcuts.map((category) => (
          <div key={category.category}>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {category.category}
            </h4>
            <div className="space-y-1">
              {category.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 Tip: Press the shortcut key combination to quickly access these actions
        </p>
      </div>
    </div>
  )
}
