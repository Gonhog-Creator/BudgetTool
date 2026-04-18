import { useState, useEffect } from 'react'
import { analyticsApi } from '../api/analytics'
import { transactionsApi } from '../api/transactions'
import { AnalyticsSummary, CategorySpending, SpendingOverTime, Transaction } from '../types'
import { PieChart, LineChart, TrendingUp, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Wallet, PiggyBank } from 'lucide-react'
import { format } from 'date-fns'
import {
  Pie,
  PieChart as RechartsPieChart,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DashboardProps {
  userId: number
}

export default function Dashboard({ userId }: DashboardProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [spendingOverTime, setSpendingOverTime] = useState<SpendingOverTime[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [summaryData, categoryData, overTimeData, transactionsData] = await Promise.all([
        analyticsApi.getSummary(userId),
        analyticsApi.getByCategory(userId),
        analyticsApi.getOverTime(userId, undefined, undefined, 'month'),
        transactionsApi.getAll(userId, { limit: 10 }),
      ])
      setSummary(summaryData)
      setCategorySpending(categoryData)
      setSpendingOverTime(overTimeData)
      setRecentTransactions(transactionsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary?.total_spent.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary?.total_income.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary?.net_balance.toFixed(2)}
              </p>
            </div>
            <Wallet className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Savings Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.total_income > 0 ? ((summary?.total_income - summary?.total_spent) / summary?.total_income * 100).toFixed(1) : 0}%
              </p>
            </div>
            <PiggyBank className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={categorySpending}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {categorySpending.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Spending Over Time */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Spending Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={spendingOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Last 10 Transactions
        </h2>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    transaction.amount >= 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {transaction.amount >= 0 ? (
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      {transaction.category && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded" style={{
                          backgroundColor: transaction.category.color + '20',
                          color: transaction.category.color
                        }}>
                          {transaction.category.name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <p className={`font-bold ${
                  transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No transactions found</p>
        )}
      </div>
    </div>
  )
}
