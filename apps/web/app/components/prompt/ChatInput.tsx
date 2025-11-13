import { Loader2, Send } from 'lucide-react';
import type { RefObject } from 'react'

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  sendMessage: () => void
  isLoading: boolean
  inputRef: RefObject<HTMLInputElement | null>
}

export function ChatInput({ input, setInput, sendMessage, isLoading, inputRef }: ChatInputProps) {
  return (
    <footer className="sticky bottom-0 z-100 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
        <div className="relative flex items-center gap-2 bg-white/60 dark:bg-white/5 rounded-[20px] border border-black/10 dark:border-white/15 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-white/8 focus-within:bg-white dark:focus-within:bg-white/10 focus-within:border-black/20 dark:focus-within:border-white/25 transition-all duration-200 px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Describe the video you're looking for..."
            className="flex-1 bg-transparent focus:outline-none text-[17px] leading-tight text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 py-2.5"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-full transition-all duration-150 ${
              input.trim() && !isLoading
                ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80 active:scale-95'
                : 'bg-black/5 dark:bg-white/10 text-black/25 dark:text-white/30 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            ) : (
              <Send className="w-[18px] h-[18px]" />
            )}
          </button>
        </div>
        <p className="text-[13px] text-center text-black/40 dark:text-white/40 mt-3 font-normal">
          Press <span className="font-medium">Return</span> to send
        </p>
      </div>
    </footer>
  )
}
