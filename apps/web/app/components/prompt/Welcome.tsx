import { Sparkles } from 'lucide-react';
import { suggestions } from '../../constants/mockVideoData';

interface WelcomeProps {
  onSuggestionClick: (text: string) => void;
}

export function Welcome({ onSuggestionClick }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-12">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full border border-purple-200/50 dark:border-purple-800/50">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-md font-medium text-purple-700 dark:text-purple-300">
            AI-Powered Video Search
          </span>
        </div>

        <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
          What videos are you
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {' '}
            looking for?
          </span>
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Describe what you want to see and I'll find the perfect clips for you
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 w-full max-w-2xl">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(s.text)}
            className={`group relative px-6 py-5 text-left bg-gradient-to-br ${s.gradient} rounded-2xl border ${s.border} hover:border-opacity-80 dark:hover:border-opacity-80 transition-all duration-300 ${s.hover} `}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                {s.icon}
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">{s.text}</span>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 dark:from-white/0 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        ))}
      </div>

      <p className="text-md text-gray-500 dark:text-gray-500 pt-2 flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        Try to be specific about what you're looking for
      </p>
    </div>
  );
}
