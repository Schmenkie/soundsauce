import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTheme } from '../hooks';
import { usePageTitle } from '../hooks/usePageTitle';

export function NotFound() {
  const { theme, t } = useTheme();
  usePageTitle('Page Not Found');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className={`text-8xl font-bold mb-2 ${
        theme === 'dark' ? 'text-zinc-800' : 'bg-gradient-to-r from-ember-500 to-amber-600 bg-clip-text text-transparent'
      }`}>
        404
      </div>
      <h1 className={`text-2xl font-bold mb-2 ${t.text}`}>Page not found</h1>
      <p className={`mb-8 max-w-md ${t.textMuted}`}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-colors ${
            theme === 'dark'
              ? 'bg-white text-black hover:bg-stone-200'
              : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
          }`}
        >
          <Home className="w-4 h-4" />
          Go Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-md transition-colors ${
            theme === 'dark'
              ? 'bg-zinc-800 text-white hover:bg-zinc-700'
              : 'bg-stone-900 text-white hover:bg-stone-800'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}
