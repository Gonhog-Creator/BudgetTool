import api from './client'

export const uploadApi = {
  uploadStatement: async (file: File, userId: number, accountType?: 'checking' | 'credit_card') => {
    const formData = new FormData()
    formData.append('file', file)
    const params: any = { user_id: userId }
    if (accountType) params.account_type = accountType
    const response = await api.post('/upload/statement', formData, {
      params,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  exportCSV: async (userId: number, startDate?: string, endDate?: string) => {
    const params: any = { user_id: userId }
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate

    const response = await api.post('/upload/csv-export', null, {
      params,
      responseType: 'blob',
    })

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'transactions_export.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
  },

  listFiles: async (userId: number) => {
    const response = await api.get('/upload/files', {
      params: { user_id: userId }
    })
    return response.data
  },

  deleteFile: async (filename: string, userId: number) => {
    const encodedFilename = encodeURIComponent(filename)
    const response = await api.delete(`/upload/files/${encodedFilename}`, {
      params: { user_id: userId }
    })
    return response.data
  },

  migrateDatabase: async () => {
    const response = await api.post('/upload/migrate')
    return response.data
  },
}
