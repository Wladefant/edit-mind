interface DashboardLayoutProps {
  children: React.ReactNode
  userEmail?: string
}

export function DashboardLayout({ children, userEmail }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-black font-['SF_Pro_Display','-apple-system','BlinkMacSystemFont','system-ui',sans-serif]">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-white">Edit Mind</h1>
          <div className="flex items-center gap-3">
            {userEmail && <span className="text-sm text-gray-600 dark:text-gray-400">{userEmail}</span>}
            <button className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-sm">👤</span>
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
