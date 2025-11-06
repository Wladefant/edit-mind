import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

type MessageProps = {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
};

export function Message({ id, sender, text }: MessageProps) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} items-center`}
    >
      {sender === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 mt-1">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-5 py-3 text-md eading-relaxed
        ${
          sender === 'user'
            ? ' dark:text-black text-white dark:bg-neutral-200 border border-neutral-200 dark:border-neutral-800'
            : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
        }`}
      >
        {text}
      </div>
    </motion.div>
  );
}
