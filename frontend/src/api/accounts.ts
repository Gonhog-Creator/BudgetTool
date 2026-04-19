import api from './client'

export const accountsApi = {
  getAll: async (userId: number) => {
    const response = await api.get('/accounts/', { params: { user_id: userId } })
    return response.data
  },
  
  create: async (data: {
    name: string
    account_type: string
    account_number?: string
    balance?: number
    user_id: number
  }) => {
    const response = await api.post('/accounts/', data)
    return response.data
  },
  
  update: async (accountId: number, data: {
    name?: string
    account_type?: string
    account_number?: string
    balance?: number
    user_id: number
  }) => {
    const response = await api.put(`/accounts/${accountId}`, data)
    return response.data
  },
  
  delete: async (accountId: number, userId: number) => {
    const response = await api.delete(`/accounts/${accountId}`, { params: { user_id: userId } })
    return response.data
  },
}
