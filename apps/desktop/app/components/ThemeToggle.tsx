import { useDarkMode } from '@/app/hooks/useDarkMode';
import { Badge } from './ui/Badge';

export const ThemeToggle = () => {
  const [theme, toggleTheme] = useDarkMode();

  return (
    <div className="flex justify-center items-center gap-2 text-sm cursor-pointer">
      <Badge
        variant="secondary"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
      </Badge>
    </div>
  );
};
