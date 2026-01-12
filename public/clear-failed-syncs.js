/**
 * Script to clear failed sync transactions from IndexedDB
 * Run this in browser console or as a standalone page
 */

// This file should be run in the browser context where IndexedDB is available
// You can copy this code and run it in the browser console at https://pos.flavidairysolution.com

export function clearFailedSyncs() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('POS_Offline_DB', 1)

    request.onerror = () => {
      console.error('Failed to open IndexedDB')
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      try {
        const transaction = db.transaction(['transactions'], 'readwrite')
        const store = transaction.objectStore('transactions')
        const index = store.index('status')
        const failedRequest = index.getAll('failed')

        failedRequest.onsuccess = () => {
          const failedTransactions = failedRequest.result
          console.log(`Found ${failedTransactions.length} failed transactions`)

          if (failedTransactions.length === 0) {
            console.log('No failed transactions to clear')
            resolve({ cleared: 0 })
            return
          }

          // Log details of failed transactions
          console.log('Failed transactions:', failedTransactions)

          // Ask for confirmation
          const shouldClear = confirm(
            `Found ${failedTransactions.length} failed transactions. Do you want to delete them?`
          )

          if (!shouldClear) {
            console.log('Cancelled by user')
            resolve({ cleared: 0, cancelled: true })
            return
          }

          // Delete each failed transaction
          let deletedCount = 0
          failedTransactions.forEach(tx => {
            const deleteRequest = store.delete(tx.id)
            deleteRequest.onsuccess = () => {
              deletedCount++
              if (deletedCount === failedTransactions.length) {
                console.log(`✓ Cleared ${deletedCount} failed transactions`)
                resolve({ cleared: deletedCount })
              }
            }
          })
        }

        failedRequest.onerror = () => {
          console.error('Failed to retrieve failed transactions')
          reject(new Error('Failed to retrieve failed transactions'))
        }
      } catch (error) {
        console.error('Error:', error)
        reject(error)
      }
    }

    request.onupgradeneeded = () => {
      console.error('Database needs upgrade - this should not happen')
      reject(new Error('Database structure mismatch'))
    }
  })
}

// Also add a function to retry failed syncs
export function retryFailedSyncs() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('POS_Offline_DB', 1)

    request.onerror = () => {
      console.error('Failed to open IndexedDB')
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      try {
        const transaction = db.transaction(['transactions'], 'readwrite')
        const store = transaction.objectStore('transactions')
        const index = store.index('status')
        const failedRequest = index.getAll('failed')

        failedRequest.onsuccess = () => {
          const failedTransactions = failedRequest.result
          console.log(`Found ${failedTransactions.length} failed transactions to retry`)

          if (failedTransactions.length === 0) {
            console.log('No failed transactions to retry')
            resolve({ retried: 0 })
            return
          }

          // Change status from 'failed' to 'pending' to retry
          let retriedCount = 0
          failedTransactions.forEach(tx => {
            const updatedTx = {
              ...tx,
              status: 'pending',
              retryCount: 0,
              error: null
            }
            const updateRequest = store.put(updatedTx)
            updateRequest.onsuccess = () => {
              retriedCount++
              if (retriedCount === failedTransactions.length) {
                console.log(`✓ Reset ${retriedCount} failed transactions to pending status`)
                console.log('Transactions will be automatically synced in the next sync cycle')
                resolve({ retried: retriedCount })
                
                // Trigger sync if window is available
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }
            }
          })
        }

        failedRequest.onerror = () => {
          console.error('Failed to retrieve failed transactions')
          reject(new Error('Failed to retrieve failed transactions'))
        }
      } catch (error) {
        console.error('Error:', error)
        reject(error)
      }
    }
  })
}

// Instructions to use in browser console:
console.log(`
========================================
Failed Sync Cleanup Utility
========================================

To clear failed syncs, run one of these commands in the browser console:

1. To DELETE failed transactions (cannot be undone):
   clearFailedSyncs()

2. To RETRY failed transactions:
   retryFailedSyncs()

3. To view all transactions:
   Open DevTools > Application > IndexedDB > POS_Offline_DB > transactions

Note: You must be on https://pos.flavidairysolution.com for this to work
========================================
`)

// Make functions available globally in browser
if (typeof window !== 'undefined') {
  ;(window as any).clearFailedSyncs = clearFailedSyncs
  ;(window as any).retryFailedSyncs = retryFailedSyncs
}
