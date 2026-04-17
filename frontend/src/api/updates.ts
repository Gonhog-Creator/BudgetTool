import api from './client'

export const updatesApi = {
  checkForUpdates: async () => {
    const response = await api.get('/updates/check')
    return response.data
  },
  
  getCurrentVersion: async () => {
    const response = await api.get('/updates/version')
    return response.data
  },
  
  applyUpdate: async () => {
    const response = await api.post('/updates/apply')
    return response.data
  },
  
  updateDependencies: async () => {
    const response = await api.post('/updates/dependencies')
    return response.data
  },
}
