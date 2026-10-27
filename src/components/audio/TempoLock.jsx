import { useState, useCallback, useMemo } from 'react';
import { Loader2, Magnet, AlertTriangle } from 'lucide-react';
import { planTempoLock, describeLockPlan, MIN_LOCK_BEATS } from '../../utils/tempoLock';
import { displayKeyName } from '../../utils/stemFiles';

/** Beat tracking below this is guesswork — usually means we were handed the wrong stem. */
const LOW_CONFIDENCE = 40;

const fmtPct = v => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}%`;

function Row({ label, children, t }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className={`font-mono text-xs uppercase tracking-wide w-20 shrink-0 ${t.textMuted}`}>{label}</span>
      <span className={`font-mono ${t.text}`}>{children}</span>
    </div>
  );
}

/**
 * "Lock to tempo" — render the stems onto a fixed grid so they go into Live with Warp off.
 *
 * Two steps, because beat tracking costs a couple of seconds and most exports don't need
 * it: find the grid (on the instrumental, never the vocal), then lock.
 *
 * @param {object} props
 * @param {number} props.duration           length of the source audio in seconds
 * @param {number|null} props.detectedBpm    the track's own tempo, for the default target
 * @param {{key:string,mode:string}|null} props.sourceKey
 * @param {() => Promise<object>} props.onAnalyse       runs DETECT_BEATS, resolves the worker result
 * @param {(plan:object, onProgress:Function) => Promise<object>} props.onLock
 * @param {boolean} props.canLock            helper is online and has rubberband
 */
export function TempoLock({ duration, detectedBpm, sourceKey, onAnalyse, onLock, canLock, theme, t }) {
  const [open, setOpen] = useState(false);
  const [beats, setBeats] = useState(null);     // worker result
  const [analysing, setAnalysing] = useState(false);
  const [targetBpm, setTargetBpm] = useState(() => (detectedBpm ? String(Math.round(detectedBpm)) : '128'));
  const [locking, setLocking] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, phase: '' });
  const [error, setError] = useState(null);

  const target = Number(targetBpm);
  const validTarget = target >= 40 && target <= 240;

  const plan = useMemo(() => {
    if (!beats?.beats?.length || !validTarget || !duration) return null;
    try {
      return planTempoLock({
        beats: beats.beats,
        targetBpm: target,
        duration,
        sampleRate: 44100,
        key: sourceKey,
        downbeatIndex: beats.downbeatIndex,
      });
    } catch {
      return null;
    }
  }, [beats, target, validTarget, duration, sourceKey]);

  const analyse = useCallback(async () => {
    setOpen(true);
    setError(null);
    setAnalysing(true);
    try {
      const result = await onAnalyse();
      if (!result?.beats?.length || result.beats.length < MIN_LOCK_BEATS) {
        throw new Error('Could not find a beat grid in this track.');
      }
      setBeats(result);
      if (!detectedBpm) setTargetBpm(String(Math.round(result.bpm)));
    } catch (err) {
      setError(err.message || 'Beat tracking failed');
    } finally {
      setAnalysing(false);
    }
  }, [onAnalyse, detectedBpm]);

  const lock = useCallback(async () => {
    if (!plan) return;
    setError(null);
    setLocking(true);
    setProgress({ percent: 0, phase: 'starting' });
    try {
      await onLock(plan, (percent, phase) => setProgress({ percent, phase }));
    } catch (err) {
      setError(err.message || 'Could not lock these stems');
    } finally {
      setLocking(false);
    }
  }, [plan, onLock]);

  const panel = theme === 'dark' ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-[#F5F6F8] border-[#D9DDE3]';

  if (!open) {
    return (
      <button
        onClick={analyse}
        className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md ${t.button}`}
        title="Render the stems onto an exact grid at a tempo you pick, so they go into Live with Warp off"
      >
        <Magnet className="w-4 h-4" />
        <span>Lock to tempo</span>
      </button>
    );
  }

  return (
    <div className={`mt-4 rounded-lg border p-4 ${panel}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h5 className={`font-display font-bold uppercase tracking-wide text-sm flex items-center gap-2 ${t.text}`}>
          <Magnet className="w-4 h-4 text-ember-500" />
          Lock to tempo
        </h5>
        <button onClick={() => setOpen(false)} className={`text-xs font-mono lowercase ${t.textMuted} hover:underline`}>close</button>
      </div>

      {analysing && (
        <p className={`flex items-center gap-2 text-sm font-mono ${t.textMuted}`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          finding the grid in the instrumental…
        </p>
      )}

      {!analysing && beats && (
        <div className="space-y-3">
          <Row label="source" t={t}>
            {beats.bpm.toFixed(2)} BPM
            <span className={t.textMuted}>
              {' '}· drifts {beats.tempoRange.min.toFixed(1)}–{beats.tempoRange.max.toFixed(1)} · {beats.beats.length} beats
            </span>
          </Row>

          {beats.confidence < LOW_CONFIDENCE && (
            <p className="flex items-start gap-2 text-xs text-ember-500">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Weak beat tracking ({beats.confidence}/100). Check the tempo above looks right before locking.
            </p>
          )}

          <div className="flex items-center gap-3">
            <label className={`font-mono text-xs uppercase tracking-wide w-20 shrink-0 ${t.textMuted}`} htmlFor="tempo-lock-target">target</label>
            <input
              id="tempo-lock-target"
              type="number"
              min="40"
              max="240"
              step="0.01"
              value={targetBpm}
              onChange={(e) => setTargetBpm(e.target.value)}
              disabled={locking}
              className={`w-24 px-2 py-1.5 rounded-md font-mono text-sm border ${theme === 'dark' ? 'bg-[#14171C] border-[#1C2027] text-white' : 'bg-white border-[#D9DDE3]'} disabled:opacity-50`}
            />
            <span className={`font-mono text-xs ${t.textMuted}`}>BPM</span>
          </div>

          {!validTarget && <p className="text-xs text-red-500">Pick a tempo between 40 and 240.</p>}

          {plan && (
            <>
              <Row label="pitch" t={t}>
                {plan.semitones === 0 ? 'unchanged' : `${plan.semitones > 0 ? '+' : '−'}${Math.abs(plan.semitones)} st by resampling`}
                {plan.resultKey && (
                  <span className={t.textMuted}>
                    {' '}→ {displayKeyName(plan.resultKey)} {plan.resultKey.mode} ({plan.resultKey.camelot})
                  </span>
                )}
              </Row>
              <Row label="stretch" t={t}>
                {fmtPct(plan.stretch.min)} … {fmtPct(plan.stretch.max)}
                <span className={t.textMuted}> · median {fmtPct(plan.stretch.median)} · a plain stretch would be {fmtPct(plan.naiveStretchPercent)}</span>
              </Row>
              <Row label="bar 1" t={t}>
                0:00
                <span className={t.textMuted}> · {plan.padSeconds.toFixed(2)}s of silence added so the downbeat is on a bar line</span>
              </Row>
            </>
          )}

          {locking && (
            <div className="space-y-1.5">
              <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-[#1C2027]' : 'bg-[#D9DDE3]'}`}>
                <div className="h-full bg-spectrum transition-all duration-300" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className={`text-xs font-mono ${t.textMuted}`}>{progress.percent}% · {progress.phase || 'rendering'} — rubberband runs at about 10× realtime</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className={`text-xs ${t.textMuted}`}>
              {canLock
                ? 'Writes a second set of FLACs into Live\'s browser. The originals stay as they are.'
                : 'Needs rubberband on this Mac — run: brew install rubberband'}
            </p>
            <button
              onClick={lock}
              disabled={!plan || locking || !canLock}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 ${
                theme === 'dark' ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'
              }`}
              title={plan ? describeLockPlan(plan) : undefined}
            >
              {locking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Magnet className="w-4 h-4" />}
              <span>{locking ? 'Locking…' : 'Lock & send to Live'}</span>
            </button>
          </div>
        </div>
      )}

      {!analysing && !beats && error && (
        <div className="space-y-2">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={analyse} className={`px-3 py-1.5 text-sm rounded-md ${t.button}`}>Try again</button>
        </div>
      )}
    </div>
  );
}
