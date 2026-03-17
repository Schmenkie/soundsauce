import { Dock } from './Dock';
import { SaucyHelper } from '../ui/SaucyHelper';

/**
 * Page layout wrapper with dock navigation
 * Content is full-width with bottom padding to clear the dock
 */
export function PageLayout({ children, theme }) {
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-950' : 'bg-stone-50'}`}>
      {/* Main content area — full width, padded for dock clearance */}
      <main className="min-h-screen">
        <div className="p-4 md:p-8 pb-28">
          {children}
        </div>
      </main>

      {/* Floating dock navigation */}
      <Dock theme={theme} />

      {/* Contextual tip mascot */}
      <SaucyHelper theme={theme} />
    </div>
  );
}
