import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';

export function LoadingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 mt-1">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
          <span className="text-md text-gray-600 dark:text-gray-400">Searching videos...</span>
        </div>
      </div>
    </motion.div>
  );
}
