import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * SynthKnob — Skeuomorphic rotary knob inspired by Serum/Vital synth plugins.
 *
 * Interaction: Vertical drag (up = increase, down = decrease) — standard DAW pattern.
 * Double-click to reset to default value.
 *
 * Uses SVG arc for value indicator, CSS for knob body with radial gradients.
 *
 * @param {number} value - Current value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} step - Value increment
 * @param {number} defaultValue - Default value (for double-click reset)
 * @param {string} label - Parameter name shown above knob
 * @param {string} formattedValue - Display string shown below knob
 * @param {string} description - Tooltip/description text
 * @param {boolean} hasOverride - Whether value differs from preset default
 * @param {boolean} isDark - Dark mode flag
 * @param {function} onChange - Callback with new value
 */
export function SynthKnob({
  value,
  min,
  max,
  step,
  defaultValue,
  label,
  formattedValue,
  description,
  hasOverride,
  isDark,
  onChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ y: 0, startValue: 0 });
  const knobRef = useRef(null);

  // Normalized 0-1 position
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Arc geometry: -135° to +135° (270° total sweep)
  const MIN_ANGLE = -135;
  const MAX_ANGLE = 135;
  const currentAngle = MIN_ANGLE + normalized * (MAX_ANGLE - MIN_ANGLE);

  // SVG arc path helper
  const SIZE = 56;
  const CENTER = SIZE / 2;
  const RADIUS = 23;
  const TRACK_WIDTH = 3;

  const polarToCartesian = (angle) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: CENTER + RADIUS * Math.cos(rad),
      y: CENTER + RADIUS * Math.sin(rad),
    };
  };

  const describeArc = (startAngle, endAngle) => {
    if (Math.abs(endAngle - startAngle) < 0.1) return '';
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  // Indicator dot position
  const indicator = polarToCartesian(currentAngle);

  // Drag handling — vertical drag controls value
  const SENSITIVITY = 200; // pixels for full range

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { y: e.clientY, startValue: value };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [value]);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      const deltaY = dragStartRef.current.y - e.clientY; // up = positive
      const range = max - min;
      const deltaValue = (deltaY / SENSITIVITY) * range;
      let newValue = dragStartRef.current.startValue + deltaValue;

      // Snap to step
      newValue = Math.round(newValue / step) * step;
      newValue = Math.max(min, Math.min(max, newValue));

      // Avoid floating point noise
      const decimals = step < 1 ? String(step).split('.')[1]?.length || 2 : 0;
      newValue = parseFloat(newValue.toFixed(decimals));

      onChange(newValue);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, min, max, step, onChange]);

  // Double-click to reset
  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  // Colors
  const accentColor = isDark ? '#F59E0B' : '#D97706';
  const trackColor = isDark ? '#3F3F46' : '#D6D3D1';
  const bodyGradientId = `knob-body-${label?.replace(/\s/g, '')}`;
  const glowOpacity = normalized > 0.3 ? normalized * 0.4 : 0;

  return (
    <div className="flex flex-col items-center gap-1 select-none" title={description}>
      {/* Label */}
      <span
        className={`text-[10px] uppercase tracking-wider font-medium leading-none ${
          hasOverride
            ? isDark ? 'text-white' : 'text-ember-600'
            : isDark ? 'text-zinc-500' : 'text-stone-400'
        }`}
      >
        {label}
      </span>

      {/* Knob SVG */}
      <div
        ref={knobRef}
        className={`relative touch-none ${isDragging ? 'cursor-ns-resize' : 'cursor-ns-resize'}`}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        role="slider"
        aria-label={`${label} — ${description || ''}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(Math.min(max, parseFloat((value + step).toFixed(10))));
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onChange(Math.max(min, parseFloat((value - step).toFixed(10))));
          }
        }}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block"
        >
          <defs>
            {/* Knob body gradient */}
            <radialGradient id={bodyGradientId} cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor={isDark ? '#52525B' : '#E7E5E4'} />
              <stop offset="100%" stopColor={isDark ? '#18181B' : '#A8A29E'} />
            </radialGradient>
            {/* Glow filter for active arc */}
            <filter id={`knob-glow-${label?.replace(/\s/g, '')}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ambient glow behind arc when value is high */}
          {glowOpacity > 0 && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS + 2}
              fill="none"
              stroke={accentColor}
              strokeWidth={6}
              opacity={glowOpacity * 0.3}
              style={{ filter: 'blur(4px)' }}
            />
          )}

          {/* Track arc (background) */}
          <path
            d={describeArc(MIN_ANGLE, MAX_ANGLE)}
            fill="none"
            stroke={trackColor}
            strokeWidth={TRACK_WIDTH}
            strokeLinecap="round"
          />

          {/* Filled arc (value) */}
          {normalized > 0.005 && (
            <path
              d={describeArc(MIN_ANGLE, currentAngle)}
              fill="none"
              stroke={accentColor}
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="round"
            />
          )}

          {/* Knob body — outer ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={17}
            fill={`url(#${bodyGradientId})`}
            stroke={isDark ? '#3F3F46' : '#D6D3D1'}
            strokeWidth={1}
          />

          {/* Knob body — inner cap */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={12}
            fill={isDark ? '#09090B' : '#F5F5F4'}
            stroke={isDark ? '#27272A' : '#D6D3D1'}
            strokeWidth={0.5}
          />

          {/* Indicator dot on the arc */}
          <circle
            cx={indicator.x}
            cy={indicator.y}
            r={3}
            fill={accentColor}
          />

          {/* Indicator line on the knob body */}
          {(() => {
            const rad = ((currentAngle - 90) * Math.PI) / 180;
            const innerR = 6;
            const outerR = 15;
            return (
              <line
                x1={CENTER + innerR * Math.cos(rad)}
                y1={CENTER + innerR * Math.sin(rad)}
                x2={CENTER + outerR * Math.cos(rad)}
                y2={CENTER + outerR * Math.sin(rad)}
                stroke={accentColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })()}
        </svg>

        {/* Drag active ring */}
        {isDragging && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: `0 0 12px ${accentColor}40, 0 0 4px ${accentColor}60`,
            }}
          />
        )}
      </div>

      {/* Value display */}
      <span
        className={`text-[11px] font-mono tabular-nums leading-none ${
          hasOverride
            ? isDark ? 'text-ember-500' : 'text-ember-600'
            : isDark ? 'text-zinc-400' : 'text-stone-500'
        }`}
      >
        {formattedValue}
      </span>
    </div>
  );
}
