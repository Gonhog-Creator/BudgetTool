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
  const [filterRecurring, setFilterRecurring] = useState<boolean | null>(null)
  const [filterUncategorized, setFilterUncategorized] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{ transactionId: number | null; categoryId: number | null; showPopover: boolean }>({ transactionId: null, categoryId: null, showPopover: false })
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTransactions()
    loadCategories()
  }, [userId, filterRecurring])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setEditingCategory({ transactionId: null, categoryId: null, showPopover: false })
      }
    }

    if (editingCategory.showPopover) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [editingCategory.showPopover])

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll(userId)
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filterRecurring !== null) params.is_recurring = filterRecurring
      const data = await transactionsApi.getAll(userId, params)
      setTransactions(data)
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
    console.log('Changing category:', transactionId, categoryId)
    try {
      await transactionsApi.update(transactionId, { category_id: categoryId }, userId)
      setEditingCategory({ transactionId: null, categoryId: null, showPopover: false })
      await loadTransactions()
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.account?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesUncategorized = !filterUncategorized || !t.category_id
    
    return matchesSearch && matchesUncategorized
  })

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
              onClick={() => setFilterRecurring(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterRecurring === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterRecurring(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterRecurring === true
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Recurring
            </button>
            <button
              onClick={() => setFilterRecurring(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterRecurring === false
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              One-time
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

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">Loading transactions...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">No transactions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
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
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
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
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
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
    </div>
  )
}
