import { useState, useEffect } from 'react'
import { transactionsApi } from '../api/transactions'
import { Transaction } from '../types'
import { Search, Filter, Edit2, Trash2, Download } from 'lucide-react'
import { format } from 'date-fns'

interface TransactionsProps {
  userId: number
}

export default function Transactions({ userId }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRecurring, setFilterRecurring] = useState<boolean | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [userId, filterRecurring])

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

  const filteredTransactions = transactions.filter((t) =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.account?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4 items-center">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: transaction.category?.color || '#e5e7eb',
                        color: '#000',
                      }}
                    >
                      {transaction.category?.name || 'Uncategorized'}
                    </span>
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
