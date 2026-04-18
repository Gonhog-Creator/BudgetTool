import { useState, useEffect } from 'react'
import { uploadApi } from '../api/upload'
import { UploadCloud, FileText, CheckCircle, AlertCircle, Shield, Trash2, FolderOpen, RefreshCw } from 'lucide-react'
import Modal from './Modal'

interface UploadProps {
  userId: number
}

export default function Upload({ userId }: UploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [accountType, setAccountType] = useState<'checking' | 'credit_card'>('checking')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [showMigrateModal, setShowMigrateModal] = useState(false)
  const [deleteFile, setDeleteFile] = useState<string | null>(null)

  useEffect(() => {
    fetchUploadedFiles()
  }, [userId])

  const fetchUploadedFiles = async () => {
    try {
      setLoadingFiles(true)
      const files = await uploadApi.listFiles(userId)
      setUploadedFiles(files)
    } catch (error) {
      console.error('Error fetching uploaded files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)
      const result = await uploadApi.uploadStatement(file, userId, accountType)
      setMessage({
        type: 'success',
        text: `Successfully imported ${result.transactions_imported} transactions`,
      })
      setFile(null)
      // Reset file input
      const input = document.getElementById('file-input') as HTMLInputElement
      if (input) input.value = ''
      // Refresh file list
      fetchUploadedFiles()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Error uploading file',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (filename: string) => {
    setDeleteFile(filename)
  }

  const confirmDelete = async () => {
    if (!deleteFile) return

    try {
      const result = await uploadApi.deleteFile(deleteFile, userId)
      if (result.deleted_count === 0 && result.message.includes('outdated')) {
        setMessage({
          type: 'error',
          text: 'Database schema is outdated. Please delete the database file and restart the server.',
        })
      } else {
        setMessage({
          type: 'success',
          text: `Deleted all transactions from ${deleteFile}`,
        })
        // Refresh file list
        fetchUploadedFiles()
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Error deleting file',
      })
    } finally {
      setDeleteFile(null)
    }
  }

  const handleMigrate = async () => {
    setShowMigrateModal(true)
  }

  const confirmMigrate = async () => {
    setShowMigrateModal(false)
    
    try {
      setMigrating(true)
      const result = await uploadApi.migrateDatabase()
      if (result.migrated) {
        setMessage({
          type: 'success',
          text: result.message,
        })
        // Refresh file list
        fetchUploadedFiles()
      } else {
        setMessage({
          type: 'success',
          text: result.message,
        })
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Migration failed',
      })
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Bank Statement</h2>
        
        {/* Account Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="accountType"
                value="checking"
                checked={accountType === 'checking'}
                onChange={(e) => setAccountType(e.target.value as 'checking' | 'credit_card')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Checking Account</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="accountType"
                value="credit_card"
                checked={accountType === 'credit_card'}
                onChange={(e) => setAccountType(e.target.value as 'checking' | 'credit_card')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">Credit Card</span>
            </label>
          </div>
        </div>
        
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            id="file-input"
            type="file"
            accept=".csv,.ofx,.qfx,.qbo,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file-input"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <UploadCloud className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                CSV, OFX, QFX, QBO, or PDF files
              </p>
            </div>
          </label>
        </div>

        {/* Selected File Info */}
        {file && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{file.name}</p>
                <p className="text-sm text-blue-700">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null)
                setMessage(null)
                const input = document.getElementById('file-input') as HTMLInputElement
                if (input) input.value = ''
              }}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-4 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload Statement'}
        </button>

        {/* Privacy Notice */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-500 mt-0.5" />
          <p className="text-xs text-gray-600">
            Your files are processed locally on your machine. The actual file is never uploaded to any server - only the parsed transaction data is stored in your local database.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        {/* Supported Formats */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-medium text-gray-900 mb-2">Supported Formats</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>CSV</strong> - Most bank exports work with automatic column detection</li>
            <li>• <strong>OFX/QFX</strong> - Quicken/QuickBooks format</li>
            <li>• <strong>QBO</strong> - QuickBooks Online format</li>
            <li>• <strong>PDF</strong> - Bank statement PDFs</li>
          </ul>
        </div>
      </div>

      {/* Uploaded Files List */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Uploaded Files
          </h2>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Update database schema"
          >
            <RefreshCw className={`w-4 h-4 ${migrating ? 'animate-spin' : ''}`} />
            {migrating ? 'Migrating...' : 'Update Database'}
          </button>
        </div>
        
        {loadingFiles ? (
          <p className="text-sm text-gray-500">Loading files...</p>
        ) : uploadedFiles.length === 0 ? (
          <p className="text-sm text-gray-500">No files uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.filename} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.filename}</p>
                  <p className="text-sm text-gray-500">
                    {file.transaction_count} transactions
                    {file.first_transaction_date && (
                      <span className="ml-2">
                        from {new Date(file.first_transaction_date).toLocaleDateString()}
                        {file.last_transaction_date && ` to ${new Date(file.last_transaction_date).toLocaleDateString()}`}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteFile(file.filename)}
                  className="ml-4 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete all transactions from this file"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Migration Confirmation Modal */}
      <Modal isOpen={showMigrateModal} onClose={() => setShowMigrateModal(false)} title="Update Database Schema">
        <p className="text-gray-600 mb-4">This will update your database schema to add missing columns. Continue?</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowMigrateModal(false)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            disabled={migrating}
          >
            Cancel
          </button>
          <button
            onClick={confirmMigrate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={migrating}
          >
            {migrating ? 'Updating...' : 'Update'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteFile !== null} onClose={() => setDeleteFile(null)} title="Delete File">
        <p className="text-gray-600 mb-4">
          Are you sure you want to delete all transactions from "{deleteFile}"? This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setDeleteFile(null)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
