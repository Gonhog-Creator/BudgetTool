import api from './client'
import { Transaction } from '../types'

export const transactionsApi = {
  getAll: async (userId: number, params?: any) => {
    const response = await api.get<Transaction[]>('/transactions', { 
      params: { user_id: userId, ...params } 
    })
    return response.data
  },
  
  getById: async (id: number, userId: number) => {
    const response = await api.get<Transaction>(`/transactions/${id}`, {
      params: { user_id: userId }
    })
    return response.data
  },
  
  create: async (transaction: Partial<Transaction>) => {
    const response = await api.post<Transaction>('/transactions', transaction)
    return response.data
  },
  
  update: async (id: number, transaction: Partial<Transaction>, userId: number) => {
    const response = await api.put<Transaction>(`/transactions/${id}`, transaction, {
      params: { user_id: userId }
    })
    return response.data
  },
  
  delete: async (id: number, userId: number) => {
    await api.delete(`/transactions/${id}`, {
      params: { user_id: userId }
    })
  },

  getCount: async (userId: number, amountFilter?: 'income' | 'expense', searchTerm?: string, excludeTerm?: string, uncategorizedOnly?: boolean) => {
    const params: any = { user_id: userId }
    if (amountFilter) params.amount_filter = amountFilter
    if (searchTerm) params.search = searchTerm
    if (excludeTerm) params.exclude = excludeTerm
    if (uncategorizedOnly) params.uncategorized_only = uncategorizedOnly
    const response = await api.get<{ count: number }>('/transactions/count', { params })
    return response.data.count
  },

  getUncategorizedCount: async (userId: number) => {
    const response = await api.get<{ count: number }>('/transactions/uncategorized-count', {
      params: { user_id: userId }
    })
    return response.data.count
  },
}
