import { useState, useEffect } from 'react'
import { accountsApi } from '../api/accounts'
import { Wallet, CreditCard, RefreshCw, Plus, Trash2, Edit2 } from 'lucide-react'

interface Account {
  id: number
  name: string
  account_type: string
  account_number: string | null
  balance: number
  created_at: string
}

function Accounts({ userId }: { userId: number }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'checking',
    account_number: '',
    balance: 0
  })

  useEffect(() => {
    loadAccounts()
  }, [userId])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await accountsApi.getAll(userId)
      setAccounts(data)
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBalances = async () => {
    try {
      await fetch(`/api/accounts/update-balances?user_id=${userId}`, {
        method: 'POST'
      })
      await loadAccounts()
    } catch (error) {
      console.error('Error updating balances:', error)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await accountsApi.create({
        ...formData,
        user_id: userId
      })
      setShowCreateForm(false)
      setFormData({ name: '', account_type: 'checking', account_number: '', balance: 0 })
      loadAccounts()
    } catch (error) {
      console.error('Error creating account:', error)
    }
  }

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAccount) return
    try {
      await accountsApi.update(editingAccount.id, {
        ...formData,
        user_id: userId
      })
      setEditingAccount(null)
      setFormData({ name: '', account_type: 'checking', account_number: '', balance: 0 })
      loadAccounts()
    } catch (error) {
      console.error('Error updating account:', error)
    }
  }

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await accountsApi.delete(accountId, userId)
      loadAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const handleEditClick = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      name: account.name,
      account_type: account.account_type,
      account_number: account.account_number || '',
      balance: account.balance
    })
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return CreditCard
      default:
        return Wallet
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'credit_card':
        return 'bg-purple-100 text-purple-600'
      case 'savings':
        return 'bg-green-100 text-green-600'
      default:
        return 'bg-blue-100 text-blue-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
        <div className="flex gap-2">
          <button
            onClick={handleUpdateBalances}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Update Balances
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {(showCreateForm || editingAccount) && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingAccount ? 'Edit Account' : 'Create Account'}
          </h3>
          <form onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="e.g., Chase Checking"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="checking">Checking</option>
                <option value="credit_card">Credit Card</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number (Last 4 digits)</label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
              <input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                {editingAccount ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingAccount(null)
                  setFormData({ name: '', account_type: 'checking', account_number: '', balance: 0 })
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No accounts yet. Click "Add Account" to create one.
          </div>
        ) : (
          accounts.map((account) => {
            const Icon = getAccountIcon(account.account_type)
            return (
              <div key={account.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${getAccountTypeColor(account.account_type)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{account.account_type.replace('_', ' ')}</p>
                      {account.account_number && (
                        <p className="text-xs text-gray-400">****{account.account_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${account.account_type === 'credit_card' && account.balance > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        ${account.balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {account.account_type === 'credit_card' && account.balance > 0 ? 'Credit (Overpaid)' : 'Current Balance'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditClick(account)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 hover:bg-red-100 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Accounts
