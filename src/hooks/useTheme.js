import { useState, useEffect } from 'react';
import { themeClasses } from '../utils/constants';

/**
 * Custom hook for managing theme state (dark/light mode).
 * Persists to localStorage so the preference survives page reloads.
 * Returns the current theme, toggle function, and theme classes.
 */
export function useTheme(initialTheme = 'dark') {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('audioAnalyzer_theme');
      return saved === 'light' || saved === 'dark' ? saved : initialTheme;
    } catch {
      return initialTheme;
    }
  });

  // Persist theme changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('audioAnalyzer_theme', theme);
    } catch {
      // localStorage not available
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const t = themeClasses[theme];

  return {
    theme,
    setTheme,
    toggleTheme,
    t, // Current theme classes
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };
}
