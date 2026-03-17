import { Component } from 'react';
import { captureException } from '../../lib/sentry';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { themeClasses } from '../../utils/constants';

/**
 * React Error Boundary — catches rendering errors in child components
 * and displays a friendly fallback UI instead of a white screen.
 *
 * Must be a class component (React requirement for error boundaries).
 *
 * Props:
 *   - theme: 'dark' | 'light' (for styled fallback)
 *   - fallbackTitle: optional custom title string
 *   - onReset: optional callback when user clicks "Reload"
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    try {
      captureException(error);
    } catch {
      // Sentry not loaded or DSN not set — silently ignore
    }
  }

  handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const theme = this.props.theme || 'dark';
    const t = themeClasses[theme];
    const title = this.props.fallbackTitle || 'Something went wrong';
    const isDark = theme === 'dark';

    return (
      <div className={`flex items-center justify-center min-h-[60vh] px-4 ${t.bg}`}>
        <div className={`${t.card} border ${t.cardBorder} p-8 max-w-md w-full text-center`}>
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${isDark ? 'bg-zinc-800' : 'bg-amber-50'}`}>
            <AlertTriangle
              className={isDark ? 'text-ember-500' : 'text-ember-600'}
              size={24}
            />
          </div>

          <h2 className={`text-lg font-semibold mb-2 ${t.text}`}>
            {title}
          </h2>

          <p className={`text-sm mb-6 ${t.textMuted}`}>
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>

          {this.state.error && (
            <div className="mb-6">
              <button
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className={`text-xs font-medium transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-stone-400 hover:text-stone-500'}`}
              >
                {this.state.showDetails ? 'Hide details' : 'Show details'}
              </button>
              {this.state.showDetails && (
                <pre className={`text-xs mt-2 p-3 rounded-md overflow-auto max-h-24 text-left ${isDark ? 'bg-zinc-950 text-zinc-500' : 'bg-stone-50 text-stone-400'}`}>
                  {this.state.error.message || String(this.state.error)}
                </pre>
              )}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all ${isDark ? t.buttonPrimary : t.buttonPrimary} shadow-lg ${isDark ? '' : 'shadow-ember-500/20'}`}
          >
            <RefreshCw size={16} />
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
