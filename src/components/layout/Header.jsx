import { Sun, Moon } from 'lucide-react';

/**
 * Application header with title, keyboard shortcuts, and theme toggle.
 */
export function Header({ theme, onThemeToggle, t }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 md:mb-8">
      <div className="flex-1 text-center">
        <h1 className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-2 md:mb-3 ${t.text}`}>
          Audio Analyzer Pro
        </h1>
        <p className={`${t.textMuted} text-base md:text-lg`}>Instrument-Focused Sound Design Tool</p>
        <p className={`${t.textDimmed} text-xs md:text-sm mt-2 hidden md:block`}>
          Space = Play/Pause | Arrow Keys = Skip 5s | L = Toggle Loop | Enter = Analyze | Esc = Clear Loop
        </p>
      </div>
      <button
        onClick={onThemeToggle}
        className={`p-3 min-w-[44px] min-h-[44px] ${t.button} transition-colors flex items-center justify-center`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
}
