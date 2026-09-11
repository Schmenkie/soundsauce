import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';

/**
 * Contextual tips keyed by route pathname.
 * Each route has an array of { title, tip } objects.
 */
const ROUTE_TIPS = {
  '/': [
    { title: 'Drop a Track', tip: 'Drag in any WAV, MP3, or M4A. Tempo and key show up in the header as soon as it decodes.' },
    { title: 'Grab Vocals', tip: 'Vocals + Instrumental is the remix default — two lossless FLACs stamped with BPM and key, ready for Live.' },
    { title: 'Keep What Matters', tip: 'Unkept stems expire from Replicate after ~7 days. Hit Keep (or Keep all) to store them permanently.' },
    { title: 'Remix Pack', tip: 'Downloads every stem plus notes.txt with tempo, key, Camelot neighbours and Ableton warp tips.' },
    { title: 'Select a Region', tip: 'Drag on the waveform to highlight a section. Analyzing a short, isolated region gives much more accurate results.' },
    { title: 'Keyboard Shortcuts', tip: 'Space to play/pause, L to toggle loop, Esc to clear selection, arrow keys to skip.' },
  ],
  '/settings': [
    { title: 'Set Your DAW', tip: 'Choose your DAW to get tailored plugin recommendations in every recipe.' },
    { title: 'Lock the Lab', tip: 'Separation and uploads cost money, so they sit behind the lab password.' },
  ],
};

const SEEN_KEY = 'soundsauce_helper_seen_routes';

/**
 * SaucyHelper — A floating contextual tip mascot.
 * Shows an animated ember icon that expands into a tip popover on click.
 * Tips are contextual to the current page. Remembers dismissed state.
 */
export function SaucyHelper({ theme }) {
  const location = useLocation();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [hasNewTip, setHasNewTip] = useState(false);
  const popoverRef = useRef(null);

  // Get tips for current route (exact match or fallback to generic)
  const routePath = location.pathname;
  const tips = ROUTE_TIPS[routePath] || ROUTE_TIPS['/'];

  // Reset tip index and check if this route has unseen tips
  useEffect(() => {
    setTipIndex(0);
    setIsOpen(false);
    try {
      const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
      if (!seen[routePath]) {
        setHasNewTip(true);
      }
    } catch { /* ignore */ }
  }, [routePath]);

  // Mark route as seen when tips are opened
  useEffect(() => {
    if (isOpen) {
      setHasNewTip(false);
      try {
        const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
        seen[routePath] = true;
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
      } catch { /* ignore */ }
    }
  }, [isOpen, routePath]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!tips || tips.length === 0) return null;

  const currentTip = tips[tipIndex];
  const hasPrev = tipIndex > 0;
  const hasNext = tipIndex < tips.length - 1;

  return (
    <div className="fixed bottom-6 right-4 z-40 hidden md:block" ref={popoverRef}>
      {/* Tip Popover */}
      {isOpen && (
        <div
          className={`absolute bottom-16 right-0 w-72 rounded-xl border shadow-xl backdrop-blur-sm transition-all ${
            isDark
              ? 'bg-zinc-900/95 border-zinc-700 shadow-black/40'
              : 'bg-white/95 border-stone-200 shadow-stone-300/30'
          }`}
          style={{
            animation: 'saucy-pop-in 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 pt-3 pb-1`}>
            <div className="flex items-center gap-2">
              <Lightbulb className={`w-3.5 h-3.5 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                Quick Tip
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`p-1 rounded-md transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-stone-100 text-stone-400'
              }`}
              aria-label="Close tips"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tip Content */}
          <div className="px-4 py-2">
            <p className={`text-sm font-medium mb-1 ${isDark ? 'text-zinc-100' : 'text-stone-800'}`}>
              {currentTip.title}
            </p>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>
              {currentTip.tip}
            </p>
          </div>

          {/* Footer Navigation */}
          <div className={`flex items-center justify-between px-4 pb-3 pt-1`}>
            <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-600' : 'text-stone-300'}`}>
              {tipIndex + 1} / {tips.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => hasPrev && setTipIndex(tipIndex - 1)}
                disabled={!hasPrev}
                className={`p-1.5 rounded-md transition-colors ${
                  hasPrev
                    ? isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-stone-100 text-stone-500'
                    : isDark ? 'text-zinc-700 cursor-default' : 'text-stone-200 cursor-default'
                }`}
                aria-label="Previous tip"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => hasNext && setTipIndex(tipIndex + 1)}
                disabled={!hasNext}
                className={`p-1.5 rounded-md transition-colors ${
                  hasNext
                    ? isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-stone-100 text-stone-500'
                    : isDark ? 'text-zinc-700 cursor-default' : 'text-stone-200 cursor-default'
                }`}
                aria-label="Next tip"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Arrow pointing to button */}
          <div className={`absolute -bottom-2 right-5 w-4 h-4 rotate-45 border-r border-b ${
            isDark ? 'bg-zinc-900/95 border-zinc-700' : 'bg-white/95 border-stone-200'
          }`} />
        </div>
      )}

      {/* Floating Mascot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? isDark
              ? 'bg-ember-500 shadow-lg shadow-ember-500/30 scale-110'
              : 'bg-ember-600 shadow-lg shadow-ember-600/30 scale-110'
            : isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 shadow-lg shadow-black/30 hover:scale-105'
              : 'bg-white hover:bg-stone-50 shadow-lg shadow-stone-300/40 hover:scale-105 border border-stone-200'
        }`}
        aria-label={isOpen ? 'Close tips' : 'Show tips'}
        style={!isOpen ? { animation: 'saucy-idle 3s ease-in-out infinite' } : undefined}
      >
        {/* Mascot icon — sound wave bars */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          className={`transition-transform duration-300 ${isOpen ? 'scale-90' : ''}`}
        >
          <rect
            x="3" y="8" width="3" height="8" rx="1.5"
            className={isOpen ? 'fill-white' : isDark ? 'fill-ember-500' : 'fill-ember-600'}
            style={!isOpen ? { animation: 'saucy-bar-1 1.8s ease-in-out infinite' } : undefined}
          />
          <rect
            x="8.5" y="5" width="3" height="14" rx="1.5"
            className={isOpen ? 'fill-white' : isDark ? 'fill-ember-500' : 'fill-ember-600'}
            style={!isOpen ? { animation: 'saucy-bar-2 1.8s ease-in-out 0.2s infinite' } : undefined}
          />
          <rect
            x="14" y="7" width="3" height="10" rx="1.5"
            className={isOpen ? 'fill-white' : isDark ? 'fill-ember-500' : 'fill-ember-600'}
            style={!isOpen ? { animation: 'saucy-bar-3 1.8s ease-in-out 0.4s infinite' } : undefined}
          />
          <rect
            x="19.5" y="9" width="3" height="6" rx="1.5"
            className={isOpen ? 'fill-white' : isDark ? 'fill-ember-500' : 'fill-ember-600'}
            style={!isOpen ? { animation: 'saucy-bar-4 1.8s ease-in-out 0.6s infinite' } : undefined}
          />
        </svg>

        {/* New tip indicator dot */}
        {hasNewTip && !isOpen && (
          <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
            isDark
              ? 'bg-ember-500 border-zinc-950'
              : 'bg-ember-600 border-stone-50'
          }`}>
            <span className={`absolute inset-0 rounded-full animate-ping ${
              isDark ? 'bg-ember-500' : 'bg-ember-600'
            } opacity-40`} />
          </span>
        )}
      </button>
    </div>
  );
}
