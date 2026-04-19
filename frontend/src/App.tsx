import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Upload from './components/Upload'
import Transactions from './components/Transactions'
import Categories from './components/Categories'
import Accounts from './components/Accounts'
import UserSelector from './components/UserSelector'
import UserSettings from './components/UserSettings'
import UpdateManager from './components/UpdateManager'
import { Layout, Menu, UploadCloud, PieChart, List, FolderOpen, Users, Settings, LogOut, Wallet } from 'lucide-react'
import { User } from './types'
import { usersApi } from './api/users'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    loadUsers()
    // Load saved user from localStorage
    const savedUserId = localStorage.getItem('selectedUserId')
    if (savedUserId) {
      loadUsers().then((loadedUsers) => {
        const user = loadedUsers.find((u) => u.id === parseInt(savedUserId))
        if (user) setSelectedUser(user)
      })
    }
  }, [])

  const loadUsers = async () => {
    try {
      const loadedUsers = await usersApi.getAll()
      setUsers(loadedUsers)
      return loadedUsers
    } catch (error) {
      console.error('Error loading users:', error)
      return []
    }
  }

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    localStorage.setItem('selectedUserId', user.id.toString())
  }

  const handleUserCreated = (user: User) => {
    setUsers([...users, user])
    setSelectedUser(user)
    localStorage.setItem('selectedUserId', user.id.toString())
  }

  const handleLogout = () => {
    setSelectedUser(null)
    localStorage.removeItem('selectedUserId')
  }

  const handleUserUpdated = (user: User) => {
    setUsers(users.map((u) => (u.id === user.id ? user : u)))
    if (selectedUser && selectedUser.id === user.id) {
      setSelectedUser(user)
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'upload', label: 'Upload', icon: UploadCloud },
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'updates', label: 'Updates', icon: Settings },
  ]

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <UserSelector
          users={users}
          onUserSelect={handleUserSelect}
          onUserCreated={handleUserCreated}
          onUserUpdated={handleUserUpdated}
          onUserDeleted={(userId) => {
            setUsers(users.filter((u) => u.id !== userId))
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Layout className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Budget Tracker</h1>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer ${
                  activeTab === 'settings' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                {selectedUser.name}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard userId={selectedUser.id} />}
        {activeTab === 'upload' && <Upload userId={selectedUser.id} />}
        {activeTab === 'transactions' && <Transactions userId={selectedUser.id} />}
        {activeTab === 'accounts' && <Accounts userId={selectedUser.id} />}
        {activeTab === 'categories' && <Categories userId={selectedUser.id} />}
        {activeTab === 'settings' && <UserSettings userId={selectedUser.id} userName={selectedUser.name} onUserUpdated={handleUserUpdated} />}
        {activeTab === 'updates' && <UpdateManager />}
      </main>
    </div>
  )
}

export default App
