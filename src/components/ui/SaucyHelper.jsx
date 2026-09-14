import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ChevronDown, Lightbulb, BookOpen, Search } from 'lucide-react';
import { GUIDE, COSTS, COST_SUMMARY } from '../../data/helperGuide';

const SEEN_KEY = 'soundsauce_helper_seen_routes';

const COST_STYLE = {
  free: 'text-[#34D399] border-[#34D399]/40',
  gpu: 'text-[#EF4444] border-[#EF4444]/40',
  blob: 'text-[#8B5CF6] border-[#8B5CF6]/40',
  disk: 'text-[#3B82F6] border-[#3B82F6]/40',
  download: 'text-[#FACC15] border-[#FACC15]/40',
};

function CostTag({ cost }) {
  const c = COSTS[cost] || COSTS.free;
  return (
    <span className={`inline-flex items-center h-4 px-1.5 rounded border font-mono text-[9px] uppercase tracking-wider whitespace-nowrap ${COST_STYLE[cost] || COST_STYLE.free}`} title={c.hint}>
      {c.label}
    </span>
  );
}

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
  const [mode, setMode] = useState('tips'); // 'tips' | 'guide'
  const [query, setQuery] = useState('');
  const [openSection, setOpenSection] = useState(0);
  const popoverRef = useRef(null);

  // Get tips + guide for current route (exact match or fallback to the Lab)
  const routePath = location.pathname;
  const page = GUIDE[routePath] || GUIDE['/'];
  const tips = page.tips;
  const sections = page.sections;

  // Search across every page's controls, not just this one
  const searchHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const hits = [];
    for (const [route, pg] of Object.entries(GUIDE)) {
      for (const sec of pg.sections) {
        for (const item of sec.items) {
          if (`${item.name} ${item.what} ${sec.title}`.toLowerCase().includes(q)) hits.push({ ...item, section: sec.title, route });
        }
      }
    }
    return hits.slice(0, 20);
  }, [query]);

  // Reset tip index and check if this route has unseen tips
  useEffect(() => {
    setTipIndex(0);
    setIsOpen(false);
    setQuery('');
    setOpenSection(0);
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
          className={`absolute bottom-16 right-0 ${mode === 'guide' ? 'w-[380px]' : 'w-72'} rounded-xl border shadow-xl backdrop-blur-sm transition-all ${
            isDark
              ? 'bg-zinc-900/95 border-zinc-700 shadow-black/40'
              : 'bg-white/95 border-stone-200 shadow-stone-300/30'
          }`}
          style={{
            animation: 'saucy-pop-in 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className={`flex items-center rounded-md border overflow-hidden ${isDark ? 'border-zinc-700' : 'border-stone-200'}`} role="tablist">
              {[['tips', Lightbulb, 'Tips'], ['guide', BookOpen, 'What does this do?']].map(([id, Icon, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => setMode(id)}
                  className={`flex items-center gap-1.5 px-2.5 h-7 text-[11px] font-medium transition-colors ${
                    mode === id
                      ? isDark ? 'bg-ember-500 text-[#1A1400]' : 'bg-ember-600 text-white'
                      : isDark ? 'text-zinc-400 hover:text-zinc-100' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
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

          {mode === 'tips' ? (
            <>
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
              <div className="flex items-center justify-between px-4 pb-3 pt-1">
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
            </>
          ) : (
            <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
              {/* Search */}
              <div className={`mx-4 mb-2 flex items-center gap-2 px-2.5 rounded-md border ${isDark ? 'bg-zinc-950 border-zinc-700' : 'bg-stone-50 border-stone-200'}`}>
                <Search className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="find a button… e.g. remix pack, keep, to live"
                  aria-label="Search the guide"
                  className={`flex-1 py-1.5 bg-transparent text-[12px] outline-none ${isDark ? 'text-zinc-100 placeholder:text-zinc-600' : 'text-stone-900 placeholder:text-stone-400'}`}
                />
                {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear" className={isDark ? 'text-zinc-500' : 'text-stone-400'}><X className="w-3 h-3" /></button>}
              </div>

              {/* Cost legend */}
              <div className="px-4 pb-2 flex flex-wrap gap-1">
                {Object.keys(COSTS).map(c => <CostTag key={c} cost={c} />)}
              </div>

              <div className="overflow-y-auto px-2 pb-3">
                {searchHits ? (
                  searchHits.length === 0 ? (
                    <p className={`px-2 py-3 text-xs ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>Nothing matches — try another word.</p>
                  ) : (
                    <ul className="space-y-1">
                      {searchHits.map((item, i) => (
                        <li key={i} className={`px-2 py-1.5 rounded-md ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-stone-100'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[12px] font-medium ${isDark ? 'text-zinc-100' : 'text-stone-800'}`}>{item.name}</span>
                            <CostTag cost={item.cost} />
                          </div>
                          <p className={`text-[11px] leading-relaxed mt-0.5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>{item.what}</p>
                          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-600' : 'text-stone-400'}`}>{item.route === '/' ? 'Lab' : item.route.slice(1)} · {item.section}</p>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="space-y-1">
                    {[...sections, { title: 'What costs what', summary: true }].map((sec, i) => {
                      const open = openSection === i;
                      return (
                        <div key={sec.title}>
                          <button
                            type="button"
                            onClick={() => setOpenSection(open ? -1 : i)}
                            aria-expanded={open}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[12px] font-medium ${isDark ? 'text-zinc-100 hover:bg-zinc-800/60' : 'text-stone-800 hover:bg-stone-100'}`}
                          >
                            {sec.title}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''} ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
                          </button>
                          {open && (
                            <ul className="pb-1">
                              {(sec.summary ? COST_SUMMARY : sec.items).map((item, j) => (
                                <li key={j} className="px-2 py-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[12px] ${sec.summary ? 'font-mono uppercase text-[10px]' : 'font-medium'} ${isDark ? 'text-zinc-100' : 'text-stone-800'}`}>{sec.summary ? COSTS[item.cost].label : item.name}</span>
                                    {!sec.summary && <CostTag cost={item.cost} />}
                                  </div>
                                  <p className={`text-[11px] leading-relaxed mt-0.5 ${isDark ? 'text-zinc-400' : 'text-stone-500'}`}>{sec.summary ? item.text : item.what}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

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
