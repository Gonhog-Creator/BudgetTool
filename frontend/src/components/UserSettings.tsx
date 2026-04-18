import { useState, useEffect } from 'react'
import { User } from '../types'
import { usersApi } from '../api/users'
import { Users, Edit2, Save, X, Trash2 } from 'lucide-react'

interface UserSettingsProps {
  userId: number
  userName: string
  onUserUpdated?: (user: User) => void
}

export default function UserSettings({ userId, userName, onUserUpdated }: UserSettingsProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(userName)
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = async () => {
    try {
      const user = await usersApi.getAll().then(users => users.find(u => u.id === userId))
      if (user) {
        setUserEmail(user.email || '')
        setEmail(user.email || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const updated = await usersApi.update(userId, { name, email: email || undefined })
      if (onUserUpdated) {
        onUserUpdated(updated)
      }
      setEditing(false)
    } catch (error) {
      console.error('Error updating user:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(userName)
    setEmail('')
    setEditing(false)
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account and all associated data? This action cannot be undone.')) {
      return
    }
    try {
      await usersApi.delete(userId)
      localStorage.removeItem('selectedUserId')
      window.location.reload()
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">User Settings</h2>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="border-b pb-6">
          <h3 className="text-lg font-semibold mb-4">Profile</h3>
          
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-gray-900">{userName}</p>
                  <p className="text-sm text-gray-600">{userEmail || 'No email set'}</p>
                  <p className="text-sm text-gray-500">User ID: {userId}</p>
                </div>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h3>
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <p className="text-sm text-red-900 mb-4">
              Deleting your account will permanently remove all your data including transactions, categories, and preferences. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
