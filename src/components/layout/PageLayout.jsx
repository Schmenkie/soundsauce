import { useState, useEffect } from 'react';
import { Dock } from './Dock';
import { SaucyHelper } from '../ui/SaucyHelper';

/**
 * Page layout wrapper with dock navigation.
 * Dock auto-hides when any modal dispatches a 'dock-visibility' custom event.
 */
export function PageLayout({ children, theme, onToggleTheme }) {
  const isDark = theme === 'dark';
  const [dockHidden, setDockHidden] = useState(false);

  useEffect(() => {
    const handler = (e) => setDockHidden(e.detail?.hidden ?? false);
    window.addEventListener('dock-visibility', handler);
    return () => window.removeEventListener('dock-visibility', handler);
  }, []);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-950' : 'bg-stone-50'}`}>
      {/* Main content area — full width, padded for dock clearance */}
      <main className="min-h-screen">
        <div className="p-4 md:p-8 pb-28">
          {children}
        </div>
      </main>

      {/* Floating dock navigation — slides away when modals are open */}
      <Dock theme={theme} onToggleTheme={onToggleTheme} hidden={dockHidden} />

      {/* Contextual tip mascot */}
      <SaucyHelper theme={theme} />
    </div>
  );
}
