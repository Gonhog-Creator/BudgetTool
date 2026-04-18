import { useState } from 'react'
import { User } from '../types'
import { usersApi } from '../api/users'
import { Users, Plus, Trash2, X, Edit2, Check } from 'lucide-react'

interface UserSelectorProps {
  users: User[]
  onUserSelect: (user: User) => void
  onUserCreated: (user: User) => void
  onUserDeleted: (userId: number) => void
  onUserUpdated?: (user: User) => void
  inline?: boolean
}

export default function UserSelector({
  users,
  onUserSelect,
  onUserCreated,
  onUserDeleted,
  onUserUpdated,
  inline = false
}: UserSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

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

  const handleEditUser = (user: User) => {
    setEditingId(user.id)
    setEditName(user.name)
    setEditEmail(user.email || '')
  }

  const handleUpdateUser = async () => {
    if (!editingId) return

    try {
      setUpdating(true)
      const updated = await usersApi.update(editingId, { 
        name: editName, 
        email: editEmail || undefined 
      })
      if (onUserUpdated) {
        onUserUpdated(updated)
      }
      setEditingId(null)
      setEditName('')
      setEditEmail('')
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditEmail('')
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
              {editingId === user.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateUser()}
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateUser()}
                  />
                  <button
                    onClick={handleUpdateUser}
                    disabled={updating}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-medium">{user.name}</span>
                  <button
                    onClick={() => handleEditUser(user)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
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
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {editingId === user.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateUser()}
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateUser()}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateUser}
                      disabled={updating}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {updating ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
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
                </>
              )}
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
