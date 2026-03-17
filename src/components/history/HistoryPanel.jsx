import React, { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, Trash2, X, Globe, Lock, Send, Zap } from 'lucide-react';
import { PublishModal } from '../recipe';

// History Panel Component
const HistoryPanel = ({ history, onLoad, onDelete, onClearAll, onTogglePublic, onPublish, freeTierPublishLabel, theme, isOpen, onToggle }) => {
  const [publishItem, setPublishItem] = useState(null);
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
                      {item.isCloud && !item.isPublic && onPublish && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPublishItem(item)}
                            className={`p-2 transition-colors rounded-md ${
                              theme === 'dark'
                                ? 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                                : 'text-stone-400 hover:text-ember-600 hover:bg-amber-50/50'
                            }`}
                            title="Publish as Sound Sauce"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          {freeTierPublishLabel && (
                            <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                              theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-50 text-ember-600'
                            }`}>
                              <Zap className="w-2.5 h-2.5" />
                              {freeTierPublishLabel}
                            </span>
                          )}
                        </div>
                      )}
                      {item.isCloud && onTogglePublic && (
                        <button
                          onClick={() => onTogglePublic(item.id)}
                          className={`p-2 transition-colors rounded-md ${
                            item.isPublic
                              ? theme === 'dark'
                                ? 'text-white bg-zinc-800 hover:bg-zinc-700'
                                : 'text-ember-600 bg-amber-50 hover:bg-amber-100'
                              : theme === 'dark'
                                ? 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800'
                                : 'text-stone-400 hover:text-ember-600 hover:bg-amber-50/50'
                          }`}
                          title={item.isPublic ? 'Public — click to make private' : 'Private — click to make public'}
                        >
                          {item.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                      )}
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
      {publishItem && (
        <PublishModal
          item={publishItem}
          theme={theme}
          onPublish={async (id, data) => {
            const success = await onPublish(id, data);
            if (success) setPublishItem(null);
            return success;
          }}
          onClose={() => setPublishItem(null)}
        />
      )}
    </div>
  );
};

export default HistoryPanel;
