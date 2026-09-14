import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useTheme } from './hooks';
import { PageLayout } from './components/layout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { trackPageView } from './lib/posthog';

// Lazy-load pages for route-level code splitting
const Analyze = lazy(() => import('./pages/Analyze').then(m => ({ default: m.Analyze })));
const Vault = lazy(() => import('./pages/Vault').then(m => ({ default: m.Vault })));
const Calc = lazy(() => import('./pages/Calc').then(m => ({ default: m.Calc })));
const Notes = lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-t-transparent border-current rounded-full animate-spin" />
    </div>
  );
}

/**
 * Remix Lab routes:
 *   /          Lab — drop a track, grab vocals / stems, analyze (/?track=<id> restores from the vault)
 *   /vault     Vault — every separated track: search, key/tempo filters, re-download, restore, delete
 *   /calc      Remix Calculator — transpose / tempo / warp advice (/calc?track=<id> prefills the source)
 *   /settings  theme, DAW, lab lock
 *   /analyze   legacy URL → /
 */
export default function App() {
  const { theme, setTheme, t } = useTheme('dark');
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ErrorBoundary theme={theme}>
      <ToastProvider theme={theme}>
      <PageLayout theme={theme} onToggleTheme={handleThemeToggle}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={
              <ErrorBoundary theme={theme} fallbackTitle="Lab error">
                <Analyze theme={theme} t={t} />
              </ErrorBoundary>
            } />
            <Route path="/analyze" element={<Navigate to="/" replace />} />
            <Route path="/vault" element={<Vault theme={theme} t={t} />} />
            <Route path="/calc" element={<Calc theme={theme} t={t} />} />
            <Route path="/notes" element={<Notes theme={theme} t={t} />} />
            <Route path="/settings" element={<Settings theme={theme} t={t} onThemeToggle={handleThemeToggle} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageLayout>
      </ToastProvider>
    </ErrorBoundary>
  );
}
