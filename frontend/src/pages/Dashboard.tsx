import { Cloud, Upload, Folder, HardDrive, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Dashboard() {
  const { user } = useAuth()

  const stats = [
    { name: 'Total Files', value: '1,234', icon: Folder, change: '+12%', changeType: 'positive' },
    { name: 'Storage Used', value: '2.4 GB', icon: HardDrive, change: '+8%', changeType: 'positive' },
    { name: 'Shared Files', value: '89', icon: Users, change: '+23%', changeType: 'positive' },
    { name: 'Available Space', value: '47.6 GB', icon: Cloud, change: '-2%', changeType: 'negative' },
  ]

  const quickActions = [
    { name: 'Upload Files', href: '/files', icon: Upload, description: 'Upload new files to your cloud storage' },
    { name: 'Create Folder', href: '/files', icon: Folder, description: 'Organize your files in folders' },
    { name: 'Share Files', href: '/files', icon: Users, description: 'Share files with team members' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}! 👋
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Here's what's happening with your cloud storage today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/files"
            className="btn-primary inline-flex items-center"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.name} className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-4">
                <div className={`text-sm ${
                  item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {item.change}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.name}
                to={action.href}
                className="group relative rounded-lg border border-gray-200 bg-white p-6 hover:border-primary-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <span className="inline-flex rounded-lg bg-primary-50 p-3 text-primary-600 group-hover:bg-primary-100 transition-colors">
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                    {action.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Upload className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">document.pdf</span> was uploaded
              </p>
              <p className="text-sm text-gray-500">2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900">
                <span className="font-medium">presentation.pptx</span> was shared with team
              </p>
              <p className="text-sm text-gray-500">4 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Folder className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-900">
                New folder <span className="font-medium">Project Assets</span> was created
              </p>
              <p className="text-sm text-gray-500">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}