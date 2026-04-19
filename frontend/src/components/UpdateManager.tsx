import { useState, useEffect } from 'react'
import { updatesApi } from '../api/updates'
import { RefreshCw, Download, CheckCircle, AlertCircle, X } from 'lucide-react'

interface UpdateStatus {
  has_update: boolean
  current_version: string
  latest_version?: string
  release_notes?: string
  download_url?: string
  published_at?: string
  error?: string
  is_git_repo?: boolean
}

export default function UpdateManager({ onClose }: { onClose?: () => void }) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [commits, setCommits] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadVersionInfo()
    loadCommits()
  }, [])

  const loadVersionInfo = async () => {
    try {
      const versionData = await updatesApi.getCurrentVersion()
      setCurrentVersion(versionData.version)
      checkForUpdates()
    } catch (error) {
      console.error('Error loading version info:', error)
    }
  }

  const loadCommits = async () => {
    try {
      const result = await updatesApi.getCommits()
      if (result.success) {
        setCommits(result.commits)
      }
    } catch (error) {
      console.error('Error loading commits:', error)
    }
  }

  const checkForUpdates = async () => {
    try {
      setChecking(true)
      const status = await updatesApi.checkForUpdates()
      setUpdateStatus(status)
    } catch (error) {
      console.error('Error checking for updates:', error)
      setMessage({ type: 'error', text: 'Failed to check for updates' })
    } finally {
      setChecking(false)
    }
  }

  const applyUpdate = async () => {
    if (!confirm('This will update the application. The backend will restart automatically. Continue?')) {
      return
    }

    try {
      setUpdating(true)
      const result = await updatesApi.applyUpdate()
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Update applied successfully! The application will restart.' })
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else {
        setMessage({ type: 'error', text: result.error || 'Update failed' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Update failed' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Update Manager</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Current Version */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Current Version</p>
            <p className="text-lg font-semibold">{currentVersion}</p>
          </div>
          <button
            onClick={checkForUpdates}
            disabled={checking}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Check for Updates
          </button>
        </div>
      </div>

      {/* Update Status */}
      {updateStatus && (
        <div className="mb-4">
          {updateStatus.error ? (
            <div className="p-4 bg-red-50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{updateStatus.error}</p>
              </div>
            </div>
          ) : updateStatus.has_update ? (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Update Available</p>
                  <p className="text-sm text-green-700">
                    Version {updateStatus.latest_version} is available (you have {updateStatus.current_version})
                  </p>
                </div>
              </div>
              
              {updateStatus.release_notes && (
                <div className="mb-3 p-3 bg-white rounded">
                  <p className="text-xs text-gray-600 mb-1">Release Notes:</p>
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">{updateStatus.release_notes}</pre>
                </div>
              )}
              
              {updateStatus.is_git_repo ? (
                <button
                  onClick={applyUpdate}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  <Download className="w-4 h-4" />
                  {updating ? 'Updating...' : 'Apply Update'}
                </button>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This installation is not a git repository. 
                    Please manually download the latest version from GitHub or clone the repository.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-blue-50 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Up to Date</p>
                <p className="text-sm text-blue-700">You are running the latest version</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          )}
          <p className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Recent Commits */}
      {commits.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Recent Commits</p>
          <div className="space-y-1">
            {commits.map((commit, index) => (
              <p key={index} className="text-xs text-gray-600 font-mono">
                {commit}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>How updates work:</strong> If you installed this tool via git, 
          updates are applied automatically using git pull. Otherwise, you'll need to 
          manually download the latest version.
        </p>
      </div>
    </div>
  )
}
