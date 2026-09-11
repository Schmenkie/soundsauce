import React from 'react';
import { Clock, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';

// History Panel Component
const HistoryPanel = ({ history, onLoad, onDelete, onClearAll, theme, isOpen, onToggle }) => {
  const t = theme === 'dark' ? {
    card: 'bg-zinc-900',
    text: 'text-white',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    hover: 'hover:bg-zinc-800',
    button: 'bg-zinc-800 text-white hover:bg-zinc-700',
  } : {
    card: 'bg-white border border-stone-200',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    hover: 'hover:bg-amber-50/50',
    button: 'bg-amber-50 text-ember-600 hover:bg-amber-100',
  };

  return (
    <div className={`mb-6 overflow-hidden rounded-lg ${t.card}`}>
      <button
        onClick={onToggle}
        className={`w-full p-4 flex items-center justify-between ${t.hover} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-zinc-400' : 'text-ember-600'}`} />
          <span className={`font-medium ${t.text}`}>Analysis History</span>
          <span className={`text-sm ${t.textDimmed}`}>({history.length} saved)</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0">
          {history.length === 0 ? (
            <p className={`text-center py-6 ${t.textDimmed}`}>No saved analyses yet. Analyze some audio to build your history!</p>
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <button
                  onClick={onClearAll}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 transition-colors rounded-lg ${
                      theme === 'dark'
                        ? 'bg-zinc-950 hover:bg-zinc-900'
                        : 'bg-stone-50 hover:bg-amber-50/50 border border-stone-200'
                    }`}
                  >
                    <button
                      onClick={() => onLoad(item)}
                      className="flex-1 text-left"
                    >
                      <div className={`font-medium ${t.text}`}>{item.title}</div>
                      <div className={`text-sm ${t.textDimmed}`}>
                        {item.instrument} | {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => onDelete(item.id)}
                        className={`p-2 transition-colors rounded-md ${t.button}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
