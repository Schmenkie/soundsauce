import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTheme } from './hooks';
import { PageLayout } from './components/layout';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { trackPageView } from './lib/posthog';

// Lazy-load all pages for route-level code splitting
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Analyze = lazy(() => import('./pages/Analyze').then(m => ({ default: m.Analyze })));
const Discover = lazy(() => import('./pages/Discover').then(m => ({ default: m.Discover })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Recipe = lazy(() => import('./pages/Recipe').then(m => ({ default: m.Recipe })));
const UserProfile = lazy(() => import('./pages/UserProfile').then(m => ({ default: m.UserProfile })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const Challenges = lazy(() => import('./pages/Challenges').then(m => ({ default: m.Challenges })));
const ChallengeDetail = lazy(() => import('./pages/ChallengeDetail').then(m => ({ default: m.ChallengeDetail })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const MyPresets = lazy(() => import('./pages/MyPresets').then(m => ({ default: m.MyPresets })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-t-transparent border-current rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { theme, setTheme, t } = useTheme('dark');
  const location = useLocation();

  // Track page views on route change
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
            <Route path="/" element={<Home theme={theme} t={t} />} />
            <Route path="/analyze" element={
              <ErrorBoundary theme={theme} fallbackTitle="Analyzer error">
                <Analyze theme={theme} t={t} />
              </ErrorBoundary>
            } />
            <Route path="/discover" element={<Discover theme={theme} t={t} />} />
            <Route path="/search" element={<Search theme={theme} t={t} />} />
            <Route path="/profile" element={<Profile theme={theme} t={t} />} />
            <Route path="/settings" element={<Settings theme={theme} t={t} onThemeToggle={handleThemeToggle} />} />
            <Route path="/recipe/:id" element={<Recipe theme={theme} t={t} />} />
            <Route path="/user/:username" element={<UserProfile theme={theme} t={t} />} />
            <Route path="/notifications" element={<Notifications theme={theme} t={t} />} />
            <Route path="/messages" element={<Messages theme={theme} t={t} />} />
            <Route path="/challenges" element={<Challenges theme={theme} t={t} />} />
            <Route path="/challenge/:id" element={<ChallengeDetail theme={theme} t={t} />} />
            <Route path="/admin" element={<Admin theme={theme} t={t} />} />
            <Route path="/privacy" element={<Privacy theme={theme} t={t} />} />
            <Route path="/terms" element={<Terms theme={theme} t={t} />} />
            <Route path="/pricing" element={<Pricing theme={theme} t={t} />} />
            <Route path="/my-presets" element={<MyPresets theme={theme} t={t} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageLayout>
      </ToastProvider>
    </ErrorBoundary>
  );
}
