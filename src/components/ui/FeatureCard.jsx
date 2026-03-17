import React from 'react';
import Tooltip from './Tooltip';

// Feature Card Component for displaying audio features
const FeatureCard = ({ label, value, unit, description, theme }) => (
  <div className={`p-3 sm:p-4 rounded-lg ${theme === 'dark' ? 'bg-zinc-900' : 'bg-stone-100'}`}>
    <div className={`text-xl sm:text-2xl font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
      {value}{unit}
    </div>
    <div className={`text-xs sm:text-sm font-medium ${theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'}`}>
      <Tooltip term={label}>{label}</Tooltip>
    </div>
    <div className={`text-[10px] sm:text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'} line-clamp-2`}>{description}</div>
  </div>
);

export default FeatureCard;
