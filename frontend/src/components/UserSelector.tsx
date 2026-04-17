import { useState } from 'react'
import { User } from '../types'
import { usersApi } from '../api/users'
import { Users, Plus, Trash2, X } from 'lucide-react'

interface UserSelectorProps {
  users: User[]
  onUserSelect: (user: User) => void
  onUserCreated: (user: User) => void
  onUserDeleted: (userId: number) => void
  inline?: boolean
}

export default function UserSelector({
  users,
  onUserSelect,
  onUserCreated,
  onUserDeleted,
  inline = false
}: UserSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateUser = async () => {
    if (!newUserName.trim()) return

    try {
      setCreating(true)
      const user = await usersApi.create({ name: newUserName, email: newUserEmail || undefined })
      onUserCreated(user)
      setNewUserName('')
      setNewUserEmail('')
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error creating user:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user and all their data?')) return
    try {
      await usersApi.delete(userId)
      onUserDeleted(userId)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (inline) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
            >
              <Users className="w-4 h-4 text-gray-600" />
              <span className="font-medium">{user.name}</span>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="User name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
              />
              <button
                onClick={handleCreateUser}
                disabled={creating || !newUserName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewUserName('')
                  setNewUserEmail('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full">
      <h2 className="text-2xl font-bold mb-6 text-center">Select or Create User</h2>
      
      {users.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-600 mb-3">Select an existing user:</p>
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div
                className="flex items-center gap-3 flex-1"
                onClick={() => onUserSelect(user)}
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  {user.email && <p className="text-sm text-gray-600">{user.email}</p>}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteUser(user.id)
                }}
                className="text-red-600 hover:text-red-700 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t pt-6">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-5 h-5" />
            Create New User
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                placeholder="Enter user name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
              <input
                type="email"
                placeholder="Enter email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateUser()}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateUser}
                disabled={creating || !newUserName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {creating ? 'Creating...' : 'Create User'}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewUserName('')
                  setNewUserEmail('')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
