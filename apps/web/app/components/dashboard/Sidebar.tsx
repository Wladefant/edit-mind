import { Home, MessageSquare, MoreHorizontal, ChevronLeft } from 'lucide-react';
import { useSession } from '~/hooks/useSession'
import { Link } from '../Link'

interface SidebarProps {
  isCollapsed?: boolean
  setIsCollapsed?: (v: boolean) => void
}

export function Sidebar({ isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const { session } = useSession()

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-50
        ${isCollapsed ? 'w-16' : 'w-72'}
        backdrop-blur-xl bg-white/60 dark:bg-black/40
        border-r border-gray-200 dark:border-white/10
        flex flex-col transition-all duration-300 ease-out shadow-sm
      `}
    >
      <div className="shrink-0 p-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isCollapsed && (
              <>
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-600 to-indigo-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {session.user?.email?.charAt(0).toUpperCase() || 'E'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[130px]">
                  {session.user?.email}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed?.(!isCollapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          >
            <ChevronLeft
              className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition-transform ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      <nav className="shrink-0 p-4 space-y-1">
        <Link isCollapsed={isCollapsed} icon={<Home className="w-5 h-5" />} to="/app/home" label="Home" />
        <Link
          isCollapsed={isCollapsed}
          icon={<MessageSquare className="w-5 h-5" />}
          to="/app/prompt/index"
          label="New Chat"
        />
      </nav>

      <div className="mt-auto p-4 border-t border-gray-200 dark:border-white/10">
        <Link
          isCollapsed={isCollapsed}
          icon={<MoreHorizontal className="w-5 h-5" />}
          to={`/app/settings`}
          label={'Settings'}
        />
      </div>
    </aside>
  )
}
