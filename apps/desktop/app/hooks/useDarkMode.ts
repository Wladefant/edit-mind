import { useState, useEffect, useCallback } from 'react';

type Theme = 'dark' | 'light';

export const useDarkMode = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setTheme(isDarkMode ? 'dark' : 'light');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return newTheme;
    });
  }, []);

  return [theme, toggleTheme];
};
