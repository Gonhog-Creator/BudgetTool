import { useState, useEffect, useRef } from 'react'
import { transactionsApi } from '../api/transactions'
import { categoriesApi } from '../api/categories'
import { Transaction, Category } from '../types'
import { Search, Filter, Edit2, Trash2, Download } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionsProps {
  userId: number
}

export default function Transactions({ userId }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filterUncategorized, setFilterUncategorized] = useState(false)
  const [totalUncategorizedCount, setTotalUncategorizedCount] = useState(0)
  const [totalTransactionCount, setTotalTransactionCount] = useState(0)
  const [sortByAmount, setSortByAmount] = useState(false)
  const [filterIncome, setFilterIncome] = useState<boolean | null>(null)
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
  const [bulkCategoryModal, setBulkCategoryModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null)
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null)
  const [dragShouldUnselect, setDragShouldUnselect] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [editingCategory, setEditingCategory] = useState<{ transactionId: number | null; categoryId: number | null; showPopover: boolean }>({ transactionId: null, categoryId: null, showPopover: false })
  const [popoverPosition, setPopoverPosition] = useState<'top' | 'bottom'>('bottom')
  const popoverRef = useRef<HTMLDivElement>(null)
  const [isPopoverOpening, setIsPopoverOpening] = useState(false)

  useEffect(() => {
    loadTransactions()
    loadCategories()
    loadUncategorizedCount()
    loadTotalTransactionCount()
  }, [userId, filterIncome, debouncedSearchTerm, filterUncategorized, sortByAmount])
  
  const loadUncategorizedCount = async () => {
    try {
      const count = await transactionsApi.getUncategorizedCount(userId)
      setTotalUncategorizedCount(count)
    } catch (error) {
      console.error('Error loading uncategorized count:', error)
    }
  }
  
  const loadTotalTransactionCount = async () => {
    try {
      const count = await transactionsApi.getCount(userId)
      setTotalTransactionCount(count)
    } catch (error) {
      console.error('Error loading total transaction count:', error)
    }
  }
  
  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isPopoverOpening) return
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setEditingCategory({ transactionId: null, categoryId: null, showPopover: false })
      }
    }

    if (editingCategory.showPopover) {
      setIsPopoverOpening(true)
      const timer = setTimeout(() => {
        setIsPopoverOpening(false)
      }, 100)
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingCategory.showPopover, isPopoverOpening])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll(userId)
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadTransactions = async (page: number = 0) => {
    try {
      setLoading(true)
      const params: any = { skip: page * 100, limit: 100 }
      if (filterIncome === true) params.amount_filter = "income"
      if (filterIncome === false) params.amount_filter = "expense"
      if (filterUncategorized) params.uncategorized_only = true
      if (sortByAmount) params.sort_by = "similarity"
      
      // Parse search term for ! prefix to extract exclude terms
      if (debouncedSearchTerm) {
        const excludeTerms: string[] = []
        const searchTerms: string[] = []
        
        debouncedSearchTerm.split(' ').forEach(term => {
          if (term.startsWith('!')) {
            excludeTerms.push(term.substring(1))
          } else {
            searchTerms.push(term)
          }
        })
        
        if (searchTerms.length > 0) {
          params.search = searchTerms.join(' ')
        }
        if (excludeTerms.length > 0) {
          params.exclude = excludeTerms.join(',')
        }
      }
      
      console.log('DEBUG: Loading transactions with params:', params)
      const data = await transactionsApi.getAll(userId, params)
      setTransactions(data)
      setCurrentPage(page)
      
      // Fetch actual total count
      const amountFilter = filterIncome === true ? 'income' : filterIncome === false ? 'expense' : undefined
      const count = await transactionsApi.getCount(userId, amountFilter, params.search, params.exclude, filterUncategorized)
      setTotalCount(count)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
    try {
      await transactionsApi.delete(id, userId)
      setTransactions(transactions.filter((t) => t.id !== id))
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const handleCategoryChange = async (transactionId: number, categoryId: number | null) => {
    // Save scroll position before update
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop
    
    try {
      // Get the transaction description before updating
      const transaction = transactions.find(t => t.id === transactionId)
      const description = transaction?.description || ''
      
      // If there are selected transactions, update all of them
      if (selectedTransactions.size > 0) {
        for (const id of selectedTransactions) {
          await transactionsApi.update(id, { category_id: categoryId }, userId)
        }
        
        // Update local state for all selected transactions
        setTransactions(transactions.map(t => {
          if (selectedTransactions.has(t.id)) {
            return { ...t, category_id: categoryId, category: categories.find(c => c.id === categoryId) }
          }
          return t
        }))
        
        // Clear selection after bulk update
        setSelectedTransactions(new Set())
      } else {
        // Only update the single transaction
        await transactionsApi.update(transactionId, { category_id: categoryId }, userId)
        
        // Update local state for all transactions with the same description
        setTransactions(transactions.map(t => {
          if (t.id === transactionId) {
            return { ...t, category_id: categoryId, category: categories.find(c => c.id === categoryId) }
          } else if (t.description === description) {
            return { ...t, category_id: categoryId, category: categories.find(c => c.id === categoryId) }
          }
          return t
        }))
      }
      
      setEditingCategory({ transactionId: null, categoryId: null, showPopover: false })
      
      // Restore scroll position after state update
      setTimeout(() => {
        window.scrollTo(0, scrollPosition)
      }, 0)
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const handleBulkCategoryChange = async (categoryId: number | null) => {
    try {
      // Update all selected transactions
      for (const transactionId of selectedTransactions) {
        await transactionsApi.update(transactionId, { category_id: categoryId }, userId)
      }
      
      // Reload transactions to reflect changes
      await loadTransactions(currentPage)
      setSelectedTransactions(new Set())
      setBulkCategoryModal(false)
    } catch (error) {
      console.error('Error updating bulk category:', error)
    }
  }

  const handleTransactionClick = (transactionId: number) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const handleRowMouseDown = (index: number, transactionId: number, e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStartIndex(index)
    setDragStartPosition({ x: e.clientX, y: e.clientY })
    setDragShouldUnselect(selectedTransactions.has(transactionId))
  }

  const handleRowMouseEnter = (index: number) => {
    if (isDragging && dragStartIndex !== null) {
      const start = Math.min(dragStartIndex, index)
      const end = Math.max(dragStartIndex, index)
      const newSelected = new Set(selectedTransactions)
      
      if (dragShouldUnselect) {
        // Unselect transactions in the drag range
        for (let i = start; i <= end; i++) {
          if (filteredTransactions[i]) {
            newSelected.delete(filteredTransactions[i].id)
          }
        }
      } else {
        // Select transactions in the drag range
        for (let i = start; i <= end; i++) {
          if (filteredTransactions[i]) {
            newSelected.add(filteredTransactions[i].id)
          }
        }
      }
      setSelectedTransactions(newSelected)
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    if (dragStartPosition) {
      const dx = e.clientX - dragStartPosition.x
      const dy = e.clientY - dragStartPosition.y
      const dragDistance = Math.sqrt(dx * dx + dy * dy)
      
      // Only consider it a drag if moved more than 5 pixels
      if (dragDistance < 5) {
        // It's a click, don't treat as drag
        setIsDragging(false)
      }
    }
    setIsDragging(false)
    setDragStartIndex(null)
    setDragStartPosition(null)
  }

  const filteredTransactions = transactions

  const uncategorizedPercentage = totalTransactionCount > 0 
    ? ((totalUncategorizedCount / totalTransactionCount) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center flex-1">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterIncome(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterIncome === null
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterIncome(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterIncome === true
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Income
            </button>
            <button
              onClick={() => setFilterIncome(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterIncome === false
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Expenses
            </button>
          </div>
        </div>
        <button
          onClick={() => setFilterUncategorized(!filterUncategorized)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            filterUncategorized
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filterUncategorized ? 'Show All' : 'Uncategorized Only'}
        </button>
      </div>

      {/* Uncategorized Stats Banner */}
      {filterUncategorized && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                {totalUncategorizedCount} uncategorized transaction{totalUncategorizedCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-orange-600">
                {uncategorizedPercentage}% of your total transactions
              </p>
            </div>
            <button
              onClick={() => setSortByAmount(!sortByAmount)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                sortByAmount 
                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                  : 'bg-white text-orange-700 border border-orange-300 hover:bg-orange-100'
              }`}
            >
              Sort by Similarity
            </button>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">Loading transactions...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">No transactions found</p>
        </div>
      ) : (
        <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${isDragging ? 'select-none' : ''}`}>
          {/* Bulk Action Bar */}
          {selectedTransactions.size > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkCategoryModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Change Category
                </button>
                <button
                  onClick={() => setSelectedTransactions(new Set())}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <p className="text-sm text-gray-600">
              Showing {currentPage * 100 + 1}-{Math.min((currentPage + 1) * 100, totalCount)} of {totalCount} transactions
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => loadTransactions(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Previous
              </button>
              <button
                onClick={() => loadTransactions(currentPage + 1)}
                disabled={transactions.length < 100}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Next
              </button>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)))
                      } else {
                        setSelectedTransactions(new Set())
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction, index) => (
                <tr 
                  key={transaction.id} 
                  className={`hover:bg-gray-50 ${selectedTransactions.has(transaction.id) ? 'bg-blue-50' : ''}`}
                  onClick={() => handleTransactionClick(transaction.id)}
                  onMouseDown={(e) => {
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                      handleRowMouseDown(index, transaction.id, e)
                    }
                  }}
                  onMouseEnter={() => handleRowMouseEnter(index)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedTransactions)
                        if (e.target.checked) {
                          newSelected.add(transaction.id)
                        } else {
                          newSelected.delete(transaction.id)
                        }
                        setSelectedTransactions(newSelected)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      {transaction.is_recurring && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                          {transaction.recurring_pattern}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 relative">
                    <div className="relative" ref={popoverRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Calculate if there's enough space below
                          const rect = e.currentTarget.getBoundingClientRect()
                          const spaceBelow = window.innerHeight - rect.bottom
                          const spaceAbove = rect.top
                          
                          // Assume popover height is around 200px
                          const popoverHeight = 200
                          
                          setPopoverPosition(spaceBelow < popoverHeight + 20 && spaceAbove > spaceBelow ? 'top' : 'bottom')
                          setEditingCategory({ transactionId: transaction.id, categoryId: transaction.category_id || null, showPopover: true })
                        }}
                        className="px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: transaction.category?.color || '#e5e7eb',
                          color: '#000',
                        }}
                      >
                        {transaction.category?.name || 'Uncategorized'}
                      </button>
                      
                      {editingCategory.transactionId === transaction.id && editingCategory.showPopover && (
                        <div className={`absolute bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px] ${
                          popoverPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                        }`}>
                          <div className="p-2 max-h-60 overflow-y-auto">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleCategoryChange(transaction.id, null)
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e5e7eb' }}></div>
                              Uncategorized
                            </button>
                            {categories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleCategoryChange(transaction.id, cat.id)
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                              >
                                <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }}></div>
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Category Change Modal */}
      {bulkCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Change Category for {selectedTransactions.size} Transaction{selectedTransactions.size !== 1 ? 's' : ''}
              </h3>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => handleBulkCategoryChange(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setBulkCategoryModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
