/**
 * InstrumentIllustration — Stylized glassmorphic SVG illustrations for instrument categories.
 * Matches the HeroBackground aesthetic (translucent shapes, amber glow, abstract forms).
 *
 * Each instrument gets a unique visual identity through shape, pattern, and glow.
 * Theme-aware: adapts colors for dark/light mode.
 *
 * @param {string} instrument - Instrument category ID (bass, lead, pad, etc.)
 * @param {number} size - SVG viewport size in px (default 48)
 * @param {boolean} isDark - Dark mode flag
 * @param {boolean} active - Whether this instrument is currently selected (brighter glow)
 */
export function InstrumentIllustration({ instrument, size = 48, isDark, active = false }) {
  const accent = isDark ? '#F59E0B' : '#D97706';
  const accentLight = isDark ? '#FBBF24' : '#F59E0B';
  const glowOpacity = active ? 0.5 : 0.2;
  const shapeOpacity = active ? 0.9 : 0.6;
  const bgFill = isDark ? '#18181B' : '#F5F5F4';
  const C = size / 2; // center

  const illustrations = {
    // Bass — deep low-frequency sine wave with weight
    bass: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <circle cx={C} cy={C} r={C * 0.7} fill={accent} opacity={glowOpacity * 0.4} filter="url(#glow)" />
        <path
          d={`M ${C * 0.25} ${C} Q ${C * 0.5} ${C * 0.3}, ${C} ${C} Q ${C * 1.5} ${C * 1.7}, ${C * 1.75} ${C}`}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={shapeOpacity}
        />
        <path
          d={`M ${C * 0.3} ${C * 1.15} Q ${C * 0.6} ${C * 0.7}, ${C} ${C * 1.15} Q ${C * 1.4} ${C * 1.6}, ${C * 1.7} ${C * 1.15}`}
          fill="none"
          stroke={accentLight}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={shapeOpacity * 0.5}
        />
      </>
    ),

    // Lead — sharp focused beam cutting through
    lead: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <line x1={C * 0.2} y1={C} x2={C * 1.8} y2={C} stroke={accent} strokeWidth={3} strokeLinecap="round" opacity={shapeOpacity} />
        <line x1={C * 0.4} y1={C} x2={C * 1.6} y2={C} stroke={accentLight} strokeWidth={1.5} strokeLinecap="round" opacity={shapeOpacity * 0.8} filter="url(#glow)" />
        {/* Saw-like teeth */}
        <path
          d={`M ${C * 0.35} ${C * 0.65} L ${C * 0.55} ${C * 1.2} L ${C * 0.75} ${C * 0.65} L ${C * 0.95} ${C * 1.2} L ${C * 1.15} ${C * 0.65} L ${C * 1.35} ${C * 1.2} L ${C * 1.55} ${C * 0.65}`}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={shapeOpacity * 0.7}
        />
      </>
    ),

    // Pad — soft diffused cloud / atmosphere
    pad: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <ellipse cx={C * 0.7} cy={C * 0.85} rx={C * 0.4} ry={C * 0.3} fill={accent} opacity={glowOpacity * 0.6} filter="url(#glow)" />
        <ellipse cx={C * 1.2} cy={C * 1.0} rx={C * 0.45} ry={C * 0.3} fill={accentLight} opacity={glowOpacity * 0.5} filter="url(#glow)" />
        <ellipse cx={C} cy={C * 1.15} rx={C * 0.35} ry={C * 0.25} fill={accent} opacity={glowOpacity * 0.4} filter="url(#glow)" />
        {/* Subtle horizontal lines suggesting sustained tone */}
        {[0.6, 0.8, 1.0, 1.2].map((y, i) => (
          <line key={i} x1={C * 0.4} y1={C * y} x2={C * 1.6} y2={C * y} stroke={accentLight} strokeWidth={0.7} opacity={shapeOpacity * 0.3} strokeLinecap="round" />
        ))}
      </>
    ),

    // Pluck — sharp attack spark fading quickly
    pluck: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        {/* Spark burst from center-left */}
        <circle cx={C * 0.65} cy={C * 0.75} r={C * 0.12} fill={accentLight} opacity={shapeOpacity} filter="url(#glow)" />
        <line x1={C * 0.65} y1={C * 0.75} x2={C * 1.6} y2={C * 0.75} stroke={accent} strokeWidth={1.5} strokeLinecap="round" opacity={shapeOpacity * 0.6} strokeDasharray="2 3" />
        {/* Decaying amplitude lines */}
        <path
          d={`M ${C * 0.65} ${C * 0.75} L ${C * 0.85} ${C * 0.45} L ${C * 1.0} ${C * 0.9} L ${C * 1.15} ${C * 0.6} L ${C * 1.3} ${C * 0.8} L ${C * 1.45} ${C * 0.7} L ${C * 1.6} ${C * 0.75}`}
          fill="none"
          stroke={accent}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={shapeOpacity * 0.8}
        />
      </>
    ),

    // Kick — impact ripples radiating outward
    kick: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <circle cx={C} cy={C} r={C * 0.15} fill={accentLight} opacity={shapeOpacity} />
        <circle cx={C} cy={C} r={C * 0.3} fill="none" stroke={accent} strokeWidth={1.5} opacity={shapeOpacity * 0.7} />
        <circle cx={C} cy={C} r={C * 0.5} fill="none" stroke={accent} strokeWidth={1} opacity={shapeOpacity * 0.4} />
        <circle cx={C} cy={C} r={C * 0.7} fill="none" stroke={accent} strokeWidth={0.7} opacity={shapeOpacity * 0.2} />
      </>
    ),

    // Drums — rhythmic pattern grid
    drums: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        {/* Grid of rhythm dots */}
        {[
          [0.45, 0.55, 3.5], [0.75, 0.55, 2], [1.15, 0.55, 3.5], [1.55, 0.55, 2],
          [0.55, 0.85, 2], [0.95, 0.85, 3.5], [1.35, 0.85, 2],
          [0.45, 1.15, 3.5], [0.75, 1.15, 2], [1.15, 1.15, 2], [1.55, 1.15, 3.5],
          [0.55, 1.45, 2], [0.95, 1.45, 3.5], [1.35, 1.45, 2],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={C * x} cy={C * y} r={r} fill={i % 3 === 0 ? accentLight : accent} opacity={shapeOpacity * (i % 3 === 0 ? 0.9 : 0.5)} />
        ))}
      </>
    ),

    // Keys — piano-style rectangles
    keys: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        {[0.35, 0.55, 0.75, 0.95, 1.15, 1.35, 1.55].map((x, i) => (
          <rect key={i} x={C * x - 2.5} y={C * 0.5} width={5} height={C} rx={1.5} fill={i === 3 ? accentLight : accent} opacity={shapeOpacity * (i === 3 ? 1 : 0.5)} />
        ))}
        {/* Black keys */}
        {[0.45, 0.65, 1.05, 1.25, 1.45].map((x, i) => (
          <rect key={`b${i}`} x={C * x - 2} y={C * 0.5} width={4} height={C * 0.6} rx={1} fill={isDark ? '#09090B' : '#27272A'} opacity={shapeOpacity * 0.8} />
        ))}
      </>
    ),

    // Guitar — vibrating string lines
    guitar: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        {[0.55, 0.75, 0.95, 1.15, 1.35, 1.5].map((y, i) => {
          const amp = i === 2 ? 8 : i === 3 ? 6 : i === 1 ? 5 : 3;
          return (
            <path
              key={i}
              d={`M ${C * 0.3} ${C * y} Q ${C * 0.65} ${C * y - amp}, ${C} ${C * y} Q ${C * 1.35} ${C * y + amp}, ${C * 1.7} ${C * y}`}
              fill="none"
              stroke={i === 2 ? accentLight : accent}
              strokeWidth={i === 2 ? 1.8 : 1}
              strokeLinecap="round"
              opacity={shapeOpacity * (i === 2 ? 0.9 : 0.4)}
            />
          );
        })}
      </>
    ),

    // Brass — horn/bell flare shape
    brass: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <path
          d={`M ${C * 0.4} ${C * 0.7} L ${C * 0.4} ${C * 1.3} L ${C * 1.0} ${C * 1.55} Q ${C * 1.5} ${C * 1.65}, ${C * 1.65} ${C * 1.35} L ${C * 1.65} ${C * 0.65} Q ${C * 1.5} ${C * 0.35}, ${C * 1.0} ${C * 0.45} Z`}
          fill={accent}
          opacity={glowOpacity * 0.5}
          filter="url(#glow)"
        />
        <path
          d={`M ${C * 0.4} ${C * 0.7} L ${C * 0.4} ${C * 1.3} L ${C * 1.0} ${C * 1.55} Q ${C * 1.5} ${C * 1.65}, ${C * 1.65} ${C * 1.35} L ${C * 1.65} ${C * 0.65} Q ${C * 1.5} ${C * 0.35}, ${C * 1.0} ${C * 0.45} Z`}
          fill="none"
          stroke={accentLight}
          strokeWidth={1.5}
          opacity={shapeOpacity * 0.8}
        />
      </>
    ),

    // Woodwind — flowing air stream with gentle curves
    woodwind: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <path
          d={`M ${C * 0.3} ${C * 0.6} C ${C * 0.6} ${C * 0.4}, ${C * 0.8} ${C * 1.0}, ${C * 1.1} ${C * 0.7} C ${C * 1.3} ${C * 0.5}, ${C * 1.5} ${C * 0.9}, ${C * 1.7} ${C * 0.65}`}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={shapeOpacity * 0.8}
        />
        <path
          d={`M ${C * 0.3} ${C * 1.1} C ${C * 0.55} ${C * 0.85}, ${C * 0.85} ${C * 1.4}, ${C * 1.15} ${C * 1.1} C ${C * 1.35} ${C * 0.9}, ${C * 1.5} ${C * 1.3}, ${C * 1.7} ${C * 1.1}`}
          fill="none"
          stroke={accentLight}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={shapeOpacity * 0.5}
        />
        {/* Air dots */}
        {[[0.5, 0.85], [0.8, 0.95], [1.1, 0.88], [1.4, 0.92]].map(([x, y], i) => (
          <circle key={i} cx={C * x} cy={C * y} r={1.5} fill={accentLight} opacity={shapeOpacity * 0.4} />
        ))}
      </>
    ),

    // Vocal — abstract sound wave suggesting a voice
    vocal: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <path
          d={`M ${C * 0.3} ${C} Q ${C * 0.45} ${C * 0.4}, ${C * 0.6} ${C} Q ${C * 0.7} ${C * 1.4}, ${C * 0.8} ${C} Q ${C * 0.9} ${C * 0.3}, ${C} ${C} Q ${C * 1.1} ${C * 1.5}, ${C * 1.2} ${C} Q ${C * 1.3} ${C * 0.4}, ${C * 1.4} ${C} Q ${C * 1.55} ${C * 1.3}, ${C * 1.7} ${C}`}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={shapeOpacity}
        />
      </>
    ),

    // Sub-bass — deep rumble circles
    'sub-bass': (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        <circle cx={C} cy={C} r={C * 0.55} fill={accent} opacity={glowOpacity * 0.3} filter="url(#glow)" />
        <circle cx={C} cy={C} r={C * 0.35} fill={accent} opacity={glowOpacity * 0.4} filter="url(#glow)" />
        <circle cx={C} cy={C} r={C * 0.15} fill={accentLight} opacity={shapeOpacity * 0.6} />
      </>
    ),

    // Full mix — overlapping waveforms
    full: (
      <>
        <circle cx={C} cy={C} r={C * 0.85} fill={bgFill} opacity={0.6} />
        {[0.7, 0.9, 1.1, 1.3].map((y, i) => (
          <path
            key={i}
            d={`M ${C * 0.3} ${C * y} Q ${C * 0.65} ${C * (y - 0.15)}, ${C} ${C * y} Q ${C * 1.35} ${C * (y + 0.15)}, ${C * 1.7} ${C * y}`}
            fill="none"
            stroke={i === 1 ? accentLight : accent}
            strokeWidth={i === 1 ? 1.5 : 1}
            strokeLinecap="round"
            opacity={shapeOpacity * (i === 1 ? 0.8 : 0.35)}
          />
        ))}
      </>
    ),
  };

  // Fallback to full mix visual if instrument not found
  const visual = illustrations[instrument] || illustrations.full;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block flex-shrink-0"
      aria-hidden="true"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {visual}
    </svg>
  );
}
