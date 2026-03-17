/**
 * SVG ADSR envelope visualization in Serum/Vital style.
 */
export function ADSREnvelope({ adsr, theme, t }) {
  if (!adsr) return null;

  const { attack, decay, sustain, release } = adsr;

  // Calculate envelope curve points
  const totalTime = Math.max(attack + decay + 200 + release, 500);
  const scale = 380 / totalTime;
  const sustainLevel = sustain / 100;

  const aX = 10;
  const aEndX = 10 + attack * scale;
  const dEndX = aEndX + decay * scale;
  const sEndX = dEndX + 200 * scale;
  const rEndX = Math.min(sEndX + release * scale, 390);

  const topY = 15;
  const bottomY = 110;
  const sustainY = bottomY - (sustainLevel * (bottomY - topY));

  const pathD = `M ${aX} ${bottomY} L ${aEndX} ${topY} L ${dEndX} ${sustainY} L ${sEndX} ${sustainY} L ${rEndX} ${bottomY}`;
  const fillD = pathD + ` L ${aX} ${bottomY} Z`;

  // Determine envelope character
  const getEnvelopeCharacter = () => {
    if (attack < 10 && sustain < 30) return 'Percussive/Pluck - Instant attack, quick decay';
    if (attack < 50 && sustain > 50) return 'Synth Lead - Snappy attack, sustained body';
    if (attack > 100 && sustain > 60) return 'Pad - Slow swell, long sustain';
    if (attack > 200) return 'Ambient/Drone - Very slow attack';
    return 'Standard envelope shape';
  };

  return (
    <div className={`p-4 ${t.card}`}>
      <div className={`text-sm font-medium ${t.textMuted} mb-3`}>Amplitude Envelope (Copy These Values)</div>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* ADSR Values */}
        <div className="grid grid-cols-4 gap-2 sm:w-64">
          <div className={`text-center p-2 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-white'}`}>
            <div className={`text-xl sm:text-2xl font-bold ${t.text}`}>{attack}</div>
            <div className={`text-[10px] ${t.textDimmed}`}>A (ms)</div>
          </div>
          <div className={`text-center p-2 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-white'}`}>
            <div className={`text-xl sm:text-2xl font-bold ${t.text}`}>{decay}</div>
            <div className={`text-[10px] ${t.textDimmed}`}>D (ms)</div>
          </div>
          <div className={`text-center p-2 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-white'}`}>
            <div className={`text-xl sm:text-2xl font-bold ${t.text}`}>{sustain}%</div>
            <div className={`text-[10px] ${t.textDimmed}`}>S</div>
          </div>
          <div className={`text-center p-2 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-white'}`}>
            <div className={`text-xl sm:text-2xl font-bold ${t.text}`}>{release}</div>
            <div className={`text-[10px] ${t.textDimmed}`}>R (ms)</div>
          </div>
        </div>
        {/* SVG Envelope Curve */}
        <div className="flex-1">
          <svg viewBox="0 0 400 120" className="w-full h-24 sm:h-28" preserveAspectRatio="xMidYMid meet">
            {/* Background grid */}
            <defs>
              <linearGradient id="envFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={theme === 'dark' ? '#ffffff' : '#000000'} stopOpacity="0.1" />
                <stop offset="100%" stopColor={theme === 'dark' ? '#ffffff' : '#000000'} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <line key={y} x1="0" y1={y * 1.1 + 5} x2="400" y2={y * 1.1 + 5} stroke={theme === 'dark' ? '#3f3f46' : '#e7e5e4'} strokeWidth="1" />
            ))}
            {/* Fill area */}
            <path d={fillD} fill="url(#envFill)" />
            {/* Main curve */}
            <path d={pathD} fill="none" stroke={theme === 'dark' ? '#ffffff' : '#000000'} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
            {/* Points */}
            <rect x={aX - 3} y={bottomY - 3} width="6" height="6" fill={theme === 'dark' ? '#ffffff' : '#000000'} />
            <rect x={aEndX - 3} y={topY - 3} width="6" height="6" fill={theme === 'dark' ? '#ffffff' : '#000000'} />
            <rect x={dEndX - 3} y={sustainY - 3} width="6" height="6" fill={theme === 'dark' ? '#ffffff' : '#000000'} />
            <rect x={sEndX - 3} y={sustainY - 3} width="6" height="6" fill={theme === 'dark' ? '#ffffff' : '#000000'} />
            <rect x={rEndX - 3} y={bottomY - 3} width="6" height="6" fill={theme === 'dark' ? '#ffffff' : '#000000'} />
            {/* Labels */}
            <text x={aEndX} y={topY - 8} fill={theme === 'dark' ? '#a1a1aa' : '#71717a'} fontSize="10" textAnchor="middle">A</text>
            <text x={dEndX} y={sustainY - 8} fill={theme === 'dark' ? '#a1a1aa' : '#71717a'} fontSize="10" textAnchor="middle">D</text>
            <text x={(dEndX + sEndX) / 2} y={sustainY - 8} fill={theme === 'dark' ? '#a1a1aa' : '#71717a'} fontSize="10" textAnchor="middle">S</text>
            <text x={rEndX} y={bottomY - 8} fill={theme === 'dark' ? '#a1a1aa' : '#71717a'} fontSize="10" textAnchor="middle">R</text>
          </svg>
        </div>
      </div>
      {/* Envelope character hint */}
      <div className={`text-xs mt-3 p-2 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-white'}`}>
        {getEnvelopeCharacter()}
      </div>
    </div>
  );
}
