/**
 * Display match score and per-band comparison for a recreation attempt.
 */
export function RecreationResult({ result, theme }) {
  const matchResult = result.matchResult || {};
  const score = result.match_score || matchResult.overallMatch || 0;
  const bands = matchResult.bandDifferences || result.band_scores || {};
  const eqSuggestions = matchResult.eqSuggestions || [];

  const scoreColor = score >= 80
    ? 'text-green-500'
    : score >= 60
      ? theme === 'dark' ? 'text-ember-500' : 'text-ember-600'
      : 'text-red-500';

  const bandNames = ['sub-bass', 'bass', 'low-mid', 'mid', 'high-mid', 'high'];

  return (
    <div className={`p-5 border rounded-lg ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
    }`}>
      {/* Overall Score */}
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${scoreColor}`}>
          {typeof score === 'number' ? `${Math.round(score)}%` : score}
        </div>
        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'}`}>
          Spectral Match
        </p>
      </div>

      {/* Band Comparison Bars */}
      {Object.keys(bands).length > 0 && (
        <div className="space-y-2 mb-4">
          <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'}`}>
            Per-Band Comparison
          </p>
          {bandNames.map(band => {
            const value = bands[band]?.similarity ?? bands[band] ?? 0;
            const pct = Math.round(value * 100);
            return (
              <div key={band} className="flex items-center gap-2">
                <span className={`text-xs w-16 flex-shrink-0 ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'
                }`}>
                  {band}
                </span>
                <div className={`flex-1 h-2 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-100'}`}>
                  <div
                    className={`h-full ${
                      pct >= 80
                        ? 'bg-green-500'
                        : pct >= 60
                          ? theme === 'dark' ? 'bg-ember-500' : 'bg-ember-600'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs w-8 text-right ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'
                }`}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* EQ Suggestions */}
      {eqSuggestions.length > 0 && (
        <div>
          <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'}`}>
            EQ Suggestions
          </p>
          <div className="space-y-1">
            {eqSuggestions.map((tip, i) => (
              <p key={i} className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-stone-500'}`}>
                {tip}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
