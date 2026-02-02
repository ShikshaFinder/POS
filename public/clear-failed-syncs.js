/**
 * Script to clear failed sync transactions from IndexedDB
 * Run this in browser console or as a standalone page
 */

// This file should be run in the browser context where IndexedDB is available
// You can copy this code and run it in the browser console at https://pos.flavidairysolution.com

// Database constants - MUST match indexedDB.ts
const DB_NAME = 'pos-offline-db'
const DB_VERSION = 1
const TRANSACTIONS_STORE = 'pending-transactions'

function clearFailedSyncs() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB')
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = (event) => {
      const db = event.target.result
      
      try {
        const transaction = db.transaction([TRANSACTIONS_STORE], 'readwrite')
        const store = transaction.objectStore(TRANSACTIONS_STORE)
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
                console.log(`Cleared ${deletedCount} failed transactions`)
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
function retryFailedSyncs() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB')
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = (event) => {
      const db = event.target.result
      
      try {
        const transaction = db.transaction([TRANSACTIONS_STORE], 'readwrite')
        const store = transaction.objectStore(TRANSACTIONS_STORE)
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
                console.log(`Reset ${retriedCount} failed transactions to pending status`)
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

// Function to view all transactions
function viewAllTransactions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB')
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = (event) => {
      const db = event.target.result
      
      try {
        const transaction = db.transaction([TRANSACTIONS_STORE], 'readonly')
        const store = transaction.objectStore(TRANSACTIONS_STORE)
        const getAllRequest = store.getAll()

        getAllRequest.onsuccess = () => {
          const allTransactions = getAllRequest.result
          console.log(`Total transactions: ${allTransactions.length}`)
          
          // Group by status
          const grouped = allTransactions.reduce((acc, tx) => {
            acc[tx.status] = acc[tx.status] || []
            acc[tx.status].push(tx)
            return acc
          }, {})
          
          console.log('Transactions by status:', grouped)
          console.table(allTransactions.map(tx => ({
            id: tx.id,
            status: tx.status,
            retryCount: tx.retryCount,
            error: tx.error,
            timestamp: new Date(tx.timestamp).toLocaleString()
          })))
          
          resolve(allTransactions)
        }

        getAllRequest.onerror = () => {
          console.error('Failed to retrieve transactions')
          reject(new Error('Failed to retrieve transactions'))
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

To manage failed syncs, run one of these commands in the browser console:

1. To DELETE failed transactions (cannot be undone):
   clearFailedSyncs()

2. To RETRY failed transactions:
   retryFailedSyncs()

3. To VIEW all transactions:
   viewAllTransactions()

4. To view in DevTools:
   Open DevTools > Application > IndexedDB > pos-offline-db > pending-transactions

Note: You must be on https://pos.flavidairysolution.com for this to work
========================================
`)

// Make functions available globally in browser
if (typeof window !== 'undefined') {
  window.clearFailedSyncs = clearFailedSyncs
  window.retryFailedSyncs = retryFailedSyncs
  window.viewAllTransactions = viewAllTransactions
}
