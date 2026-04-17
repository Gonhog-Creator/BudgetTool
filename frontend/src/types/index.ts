export interface User {
  id: number
  name: string
  email?: string
  created_at: string
}

export interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  account?: string
  category_id?: number
  user_id: number
  is_recurring: boolean
  recurring_pattern?: string
  notes?: string
  original_filename?: string
  created_at: string
  category?: Category
}

export interface Category {
  id: number
  name: string
  description?: string
  color: string
  keywords?: string
  user_id: number
  created_at: string
}

export interface AnalyticsSummary {
  total_spent: number
  total_income: number
  net_balance: number
  transaction_count: number
  period_start: string
  period_end: string
}

export interface CategorySpending {
  category_id?: number
  category_name: string
  amount: number
  transaction_count: number
  color: string
}

export interface SpendingOverTime {
  date: string
  amount: number
}

export interface RecurringPaymentSummary {
  description: string
  amount: number
  frequency: string
  next_expected_date?: string
}
