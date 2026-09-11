import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

/**
 * Step - An individual step card that can expand/collapse.
 *
 * @param {Object} props
 * @param {number} props.number - Step number (1-4)
 * @param {string} props.title - Step title
 * @param {import('lucide-react').LucideIcon} props.icon - Lucide icon component
 * @param {React.ReactNode} props.children - Step content
 * @param {boolean} props.isCompleted - Whether step is completed
 * @param {boolean} props.isExpanded - Whether content is visible
 * @param {() => void} props.onToggle - Toggle expand/collapse
 * @param {boolean} [props.optional] - Shows "Optional" badge
 * @param {'dark'|'light'} props.theme - Current theme
 */
export function Step({
  number,
  title,
  icon: Icon,
  children,
  isCompleted = false,
  isExpanded = false,
  onToggle,
  optional = false,
  theme,
}) {
  const isDark = theme === 'dark';

  const cardBg = isDark ? 'bg-zinc-900' : 'bg-white';
  const borderColor = isDark ? 'border-zinc-700' : 'border-stone-200';
  const textColor = isDark ? 'text-zinc-50' : 'text-stone-900';
  const mutedColor = isDark ? 'text-zinc-400' : 'text-stone-500';
  const dimmedColor = isDark ? 'text-zinc-500' : 'text-stone-400';

  const numberCircleBg = isCompleted
    ? 'bg-emerald-500/15 text-emerald-500'
    : isDark
      ? 'bg-zinc-800 text-zinc-400'
      : 'bg-stone-100 text-stone-500';

  return (
    <div
      className={`${cardBg} border ${borderColor} rounded-lg overflow-hidden transition-colors ${
        isExpanded ? (isDark ? 'border-l-ember-500' : 'border-l-ember-600') : ''
      }`}
      style={isExpanded ? { borderLeftWidth: '3px' } : undefined}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${
          isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-stone-50'
        }`}
        aria-expanded={isExpanded}
      >
        {/* Step number circle */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${numberCircleBg}`}
        >
          {isCompleted ? <Check className="w-3.5 h-3.5" /> : number}
        </div>

        {/* Icon */}
        {Icon && (
          <Icon
            className={`w-4 h-4 shrink-0 ${
              isExpanded
                ? isDark
                  ? 'text-ember-500'
                  : 'text-ember-600'
                : mutedColor
            }`}
          />
        )}

        {/* Title */}
        <span className={`font-display font-medium text-sm ${textColor} flex-1 text-left`}>
          {title}
        </span>

        {/* Completed checkmark */}
        {isCompleted && (
          <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium shrink-0">
            <Check className="w-3.5 h-3.5" />
            Done
          </span>
        )}

        {/* Optional badge */}
        {optional && !isCompleted && (
          <span
            className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
              isDark
                ? 'bg-zinc-800 text-zinc-500'
                : 'bg-stone-100 text-stone-400'
            }`}
          >
            Optional
          </span>
        )}

        {/* Chevron toggle */}
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 shrink-0 ${dimmedColor}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 shrink-0 ${dimmedColor}`} />
        )}
      </button>

      {/* Content - animated expand/collapse */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className={`px-4 pb-4 pt-1 border-t ${
                isDark ? 'border-zinc-800' : 'border-stone-100'
              }`}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
