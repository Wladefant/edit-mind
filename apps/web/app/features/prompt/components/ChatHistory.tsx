import { MessageSquare, Home, ChevronLeft, MoreHorizontal, SearchIcon, Users } from 'lucide-react'
import type { Chat } from '@prisma/client'
import { useState, useMemo } from 'react'
import { isSameDay } from 'date-fns'
import { useSession } from '~/features/auth/hooks/useSession'
import { Link } from '~/features/shared/components/Link'

interface ChatHistoryProps {
  chats?: Chat[]
}

export function ChatHistory({ chats = [] }: ChatHistoryProps) {
  const { session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { today, yesterday, others } = useMemo(() => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const todayChats = chats.filter((chat) => isSameDay(new Date(chat.createdAt), today))

    const yesterdayChats = chats.filter((chat) => isSameDay(new Date(chat.createdAt), yesterday))
    const othersChats = chats.filter(
      (chat) => !isSameDay(new Date(chat.createdAt), yesterday) && !isSameDay(new Date(chat.createdAt), today)
    )

    return { today: todayChats, yesterday: yesterdayChats, others: othersChats }
  }, [chats])

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-200
        ${isCollapsed ? 'w-16' : 'w-72'}
        backdrop-blur-xl
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
                  {session.user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[130px]">
                  {session.user?.email}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
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
        <Link isCollapsed={isCollapsed} icon={<SearchIcon className="w-5 h-5" />} to="/app/search" label="Search" />
        <Link
          isCollapsed={isCollapsed}
          icon={<MessageSquare className="w-5 h-5" />}
          to="/app/prompt"
          label="New Chat"
        />
        <Link isCollapsed={isCollapsed} icon={<Users className="w-5 h-5" />} to="/app/training" label="Face Training" />
      </nav>

      {!isCollapsed && (
        <div className="flex-1 overflow-hidden px-4">
          <div className="h-full overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-neutral-700">
            {today.length > 0 && (
              <div className="border-t mt-4 py-4 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 px-3">Today</h3>
                <div className="space-y-1">
                  {today.map((chat) => (
                    <Link
                      key={chat.id}
                      isCollapsed={isCollapsed}
                      icon={<MessageSquare className="w-5 h-5" />}
                      to={`/app/prompt/${chat.id}`}
                      label={chat.title || 'Untitled Chat'}
                    />
                  ))}
                </div>
              </div>
            )}

            {yesterday.length > 0 && (
              <div className="border-t mt-4 py-4 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 px-3">Yesterday</h3>
                <div className="space-y-1">
                  {yesterday.map((chat) => (
                    <Link
                      key={chat.id}
                      isCollapsed={isCollapsed}
                      icon={<MessageSquare className="w-5 h-5" />}
                      to={`/app/prompt/${chat.id}`}
                      label={chat.title || 'Untitled Chat'}
                    />
                  ))}
                </div>
              </div>
            )}

            {others.length > 0 && (
              <div className="border-t mt-4 py-4 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2 px-3">Previously</h3>
                <div className="space-y-1">
                  {others.map((chat) => (
                    <Link
                      key={chat.id}
                      isCollapsed={isCollapsed}
                      icon={<MessageSquare className="w-5 h-5" />}
                      to={`/app/prompt/${chat.id}`}
                      label={chat.title || 'Untitled Chat'}
                    />
                  ))}
                </div>
              </div>
            )}

            {today.length === 0 && yesterday.length === 0 && others.length === 0 && (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="shrink-0 p-4 border-t border-gray-200 dark:border-white/10">
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
