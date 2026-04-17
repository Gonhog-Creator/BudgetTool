import { useState } from 'react'
import { uploadApi } from '../api/upload'
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadProps {
  userId: number
}

export default function Upload({ userId }: UploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
      const result = await uploadApi.uploadStatement(file, userId)
      setMessage({
        type: 'success',
        text: `Successfully imported ${result.transactions_imported} transactions`,
      })
      setFile(null)
      // Reset file input
      const input = document.getElementById('file-input') as HTMLInputElement
      if (input) input.value = ''
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Error uploading file',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Bank Statement</h2>
        
        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            id="file-input"
            type="file"
            accept=".csv,.ofx,.qfx,.qbo"
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
                CSV, OFX, QFX, or QBO files
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
          </ul>
        </div>
      </div>
    </div>
  )
}
