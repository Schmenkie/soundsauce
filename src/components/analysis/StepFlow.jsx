import { Check } from 'lucide-react';

/**
 * StepFlow - Container for Step components with a vertical progress indicator.
 *
 * Desktop: thin vertical line with numbered circles on the left, content on the right.
 * Mobile: horizontal compact dots above, content below full-width.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Step components
 * @param {Set<number>} props.completedSteps - Set of completed step numbers
 * @param {'dark'|'light'} props.theme - Current theme
 */
export function StepFlow({ children, completedSteps = new Set(), theme }) {
  const isDark = theme === 'dark';

  // Extract step numbers from children for the progress indicator
  const steps = [];
  let childArray = Array.isArray(children) ? children : [children];
  childArray = childArray.filter(Boolean);
  childArray.forEach((child) => {
    if (child?.props?.number) {
      steps.push(child.props.number);
    }
  });

  // Find the first non-completed step (active step)
  const activeStep = steps.find((n) => !completedSteps.has(n)) ?? null;

  const getCircleClasses = (stepNum) => {
    if (completedSteps.has(stepNum)) {
      return 'bg-ember-500 text-white';
    }
    if (stepNum === activeStep) {
      return isDark
        ? 'bg-zinc-900 text-ember-500 ring-2 ring-ember-500'
        : 'bg-white text-ember-600 ring-2 ring-ember-600';
    }
    return isDark
      ? 'bg-zinc-800 text-zinc-500'
      : 'bg-stone-200 text-stone-400';
  };

  const getLineColor = (fromStep, toStep) => {
    if (completedSteps.has(fromStep) && completedSteps.has(toStep)) {
      return isDark ? 'bg-ember-500' : 'bg-ember-600';
    }
    return isDark ? 'bg-zinc-800' : 'bg-stone-200';
  };

  return (
    <div className="w-full">
      {/* Mobile: horizontal dots */}
      <div className="flex md:hidden items-center justify-center gap-2 mb-4 px-4">
        {steps.map((stepNum, i) => (
          <div key={stepNum} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${getCircleClasses(stepNum)} ${
                stepNum === activeStep ? 'animate-pulse' : ''
              }`}
            >
              {completedSteps.has(stepNum) ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                stepNum
              )}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-6 rounded-full transition-colors ${getLineColor(stepNum, steps[i + 1])}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Desktop: vertical progress line + content. Mobile: content only (no sidebar) */}
      <div className="flex gap-0 md:gap-6">
        {/* Vertical progress indicator (desktop only) */}
        <div className="hidden md:flex flex-col items-center w-10 shrink-0 pt-5">
          {steps.map((stepNum, i) => (
            <div key={stepNum} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${getCircleClasses(stepNum)} ${
                  stepNum === activeStep ? 'animate-pulse' : ''
                }`}
              >
                {completedSteps.has(stepNum) ? (
                  <Check className="w-4 h-4" />
                ) : (
                  stepNum
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-0.5 h-8 my-1 rounded-full transition-colors ${getLineColor(stepNum, steps[i + 1])}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content area (single render for both layouts) */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {children}
        </div>
      </div>
    </div>
  );
}
