import { useState, useEffect } from 'react'
import { categoriesApi } from '../api/categories'
import { Category } from '../types'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'

interface CategoriesProps {
  userId: number
}

export default function Categories({ userId }: CategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    description: '',
    color: '#3b82f6',
    keywords: '',
  })
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [userId])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await categoriesApi.getAll(userId)
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newCategory.name) return
    try {
      const created = await categoriesApi.create(newCategory, userId)
      setCategories([...categories, created])
      setNewCategory({ name: '', description: '', color: '#3b82f6', keywords: '' })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const handleUpdate = async (id: number, category: Partial<Category>) => {
    try {
      const updated = await categoriesApi.update(id, category, userId)
      setCategories(categories.map((c) => (c.id === id ? updated : c)))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    try {
      await categoriesApi.delete(id, userId)
      setCategories(categories.filter((c) => c.id !== id))
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  ]

  if (loading) {
    return <div className="text-center py-12">Loading categories...</div>
  }

  return (
    <div className="space-y-4">
      {/* Add Category Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      )}

      {/* Add Category Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                    className={`w-8 h-8 rounded-full border-2 ${
                      newCategory.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keywords (comma-separated for auto-categorization)
              </label>
              <input
                type="text"
                value={newCategory.keywords}
                onChange={(e) => setNewCategory({ ...newCategory, keywords: e.target.value })}
                placeholder="netflix, spotify, gym"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Category
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewCategory({ name: '', description: '', color: '#3b82f6', keywords: '' })
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keywords
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                {editingId === category.id ? (
                  <>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleUpdate(category.id, { ...category, color })}
                            className={`w-6 h-6 rounded-full border-2 ${
                              category.color === color ? 'border-gray-900' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        defaultValue={category.name}
                        onBlur={(e) => handleUpdate(category.id, { ...category, name: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        defaultValue={category.description || ''}
                        onBlur={(e) => handleUpdate(category.id, { ...category, description: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        defaultValue={category.keywords || ''}
                        onBlur={(e) => handleUpdate(category.id, { ...category, keywords: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{category.name}</td>
                    <td className="px-6 py-4 text-gray-600">{category.description || '-'}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{category.keywords || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setEditingId(category.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
