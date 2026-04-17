import { useState, useEffect } from 'react'
import { analyticsApi } from '../api/analytics'
import { AnalyticsSummary, CategorySpending, SpendingOverTime, RecurringPaymentSummary } from '../types'
import { PieChart, LineChart, TrendingUp, DollarSign, Repeat, Calendar } from 'lucide-react'
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
  const [recurringPayments, setRecurringPayments] = useState<RecurringPaymentSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [summaryData, categoryData, overTimeData, recurringData] = await Promise.all([
        analyticsApi.getSummary(userId),
        analyticsApi.getByCategory(userId),
        analyticsApi.getOverTime(userId, undefined, undefined, 'day'),
        analyticsApi.getRecurring(userId),
      ])
      setSummary(summaryData)
      setCategorySpending(categoryData)
      setSpendingOverTime(overTimeData)
      setRecurringPayments(recurringData)
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
            <PieChart className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.transaction_count}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
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

      {/* Recurring Payments */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Repeat className="w-5 h-5" />
          Recurring Payments
        </h2>
        {recurringPayments.length > 0 ? (
          <div className="space-y-3">
            {recurringPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{payment.description}</p>
                  <p className="text-sm text-gray-600">{payment.frequency}</p>
                </div>
                <p className="font-bold text-gray-900">
                  ${Math.abs(payment.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recurring payments detected</p>
        )}
      </div>
    </div>
  )
}
