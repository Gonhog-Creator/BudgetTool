import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Upload from './components/Upload'
import Transactions from './components/Transactions'
import Categories from './components/Categories'
import UserSelector from './components/UserSelector'
import UpdateManager from './components/UpdateManager'
import { Layout, Menu, UploadCloud, PieChart, List, FolderOpen, Users, Settings } from 'lucide-react'
import { User } from './types'
import { usersApi } from './api/users'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [showUpdateManager, setShowUpdateManager] = useState(false)

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
    setShowUserSelector(false)
  }

  const handleUserCreated = (user: User) => {
    setUsers([...users, user])
    setSelectedUser(user)
    localStorage.setItem('selectedUserId', user.id.toString())
    setShowUserSelector(false)
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'upload', label: 'Upload', icon: UploadCloud },
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'updates', label: 'Updates', icon: Settings },
  ]

  if (!selectedUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <UserSelector
          users={users}
          onUserSelect={handleUserSelect}
          onUserCreated={handleUserCreated}
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
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                <Users className="w-4 h-4" />
                {selectedUser.name}
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

      {showUserSelector && (
        <div className="bg-white border-b shadow-sm">
          <UserSelector
            users={users}
            onUserSelect={handleUserSelect}
            onUserCreated={handleUserCreated}
            onUserDeleted={(userId) => {
              setUsers(users.filter((u) => u.id !== userId))
              if (selectedUser.id === userId) {
                setSelectedUser(null)
                localStorage.removeItem('selectedUserId')
              }
            }}
            inline
          />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard userId={selectedUser.id} />}
        {activeTab === 'upload' && <Upload userId={selectedUser.id} />}
        {activeTab === 'transactions' && <Transactions userId={selectedUser.id} />}
        {activeTab === 'categories' && <Categories userId={selectedUser.id} />}
        {activeTab === 'updates' && <UpdateManager />}
      </main>
    </div>
  )
}

export default App
