import { motion } from 'framer-motion'
import { Outlet } from 'react-router';
import { Sidebar } from '~/features/auth/components/Sidebar'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-black font-['SF_Pro_Display','-apple-system','BlinkMacSystemFont','system-ui',sans-serif]">
      <Sidebar />
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
