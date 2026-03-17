import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { tooltipDefinitions } from '../../utils/constants';

// Tooltip component for displaying term definitions
const Tooltip = ({ term, children, theme }) => {
  const [show, setShow] = useState(false);

  const definition = tooltipDefinitions[term];
  if (!definition) return children;

  const isDark = theme !== 'light';

  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-colors ${
          isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-stone-100 hover:bg-stone-200'
        }`}
      >
        <Info className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
      </button>
      {show && (
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 border rounded-lg shadow-xl z-50 text-sm font-normal ${
          isDark
            ? 'bg-zinc-900 border-zinc-700 text-zinc-500'
            : 'bg-white border-stone-200 text-stone-500'
        }`}>
          <div className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-stone-900'}`}>{term}</div>
          {definition}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent ${
            isDark ? 'border-t-zinc-900' : 'border-t-white'
          }`} />
        </div>
      )}
    </span>
  );
};

export default Tooltip;
