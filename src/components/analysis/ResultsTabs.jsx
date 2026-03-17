import { useState, useRef, useEffect } from 'react';
import { Music, Zap, BarChart2 } from 'lucide-react';

/**
 * Tabbed interface for analysis results.
 * Reduces overwhelming sections into 3 digestible tabs:
 * Vital Preset (browse presets & synthesis tips), DAW Recipe (plugin recommendations & detailed settings), Full Analysis.
 */
export function ResultsTabs({ children, theme, dawPreference }) {
  const [activeTab, setActiveTab] = useState('vital');
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const [contentKey, setContentKey] = useState(0); // Triggers fade-in on tab change
  const tabsRef = useRef({});
  const containerRef = useRef(null);

  const dawName = dawPreference || 'Ableton Live';
  const isDark = theme === 'dark';

  const tabs = [
    { id: 'vital', label: 'Vital Preset', shortLabel: 'Vital', icon: Music },
    { id: 'daw', label: `${dawName} Recipe`, shortLabel: 'Recipe', icon: Zap },
    { id: 'detailed', label: 'Full Analysis', shortLabel: 'Analysis', icon: BarChart2 },
  ];

  // Animate underline indicator to active tab position
  useEffect(() => {
    const tabEl = tabsRef.current[activeTab];
    const containerEl = containerRef.current;
    if (tabEl && containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setContentKey(prev => prev + 1); // Trigger content fade-in
    }
  };

  // Filter children based on active tab
  const childArray = Array.isArray(children) ? children : [children];

  const getChildrenForTab = (tabId) => {
    return childArray.filter(child => {
      if (!child?.props?.['data-tab']) return false;
      return child.props['data-tab'] === tabId;
    });
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Analysis results"
        className={`relative flex rounded-lg overflow-hidden sticky top-0 z-10 ${
          isDark ? 'bg-zinc-900/95 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm border border-stone-200 shadow-sm'
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={el => { tabsRef.current[tab.id] = el; }}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3.5 font-medium transition-all duration-200 ${
                isActive
                  ? isDark
                    ? 'text-ember-500 bg-white/5'
                    : 'text-ember-600 bg-ember-50/60'
                  : isDark
                    ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                    : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="hidden sm:inline text-sm">{tab.label}</span>
              <span className="sm:hidden text-sm">{tab.shortLabel}</span>
            </button>
          );
        })}

        {/* Animated underline indicator */}
        <div
          className={`absolute bottom-0 h-[2px] rounded-full transition-all duration-300 ease-out ${
            isDark ? 'bg-ember-500' : 'bg-ember-600'
          }`}
          style={{
            left: indicatorStyle.left ?? 0,
            width: indicatorStyle.width ?? 0,
          }}
        />
      </div>

      {/* Tab Content with fade-in animation */}
      <div
        key={contentKey}
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="space-y-6 animate-tab-content"
      >
        {getChildrenForTab(activeTab)}
      </div>
    </div>
  );
}
