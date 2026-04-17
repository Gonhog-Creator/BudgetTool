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
}
