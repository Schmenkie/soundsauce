import { useState } from 'react';
import {
  Download, Loader2, Scissors, X, Check, Mic, Disc, Activity, Piano,
  Guitar, Layers, Cloud, CloudOff, Package, RotateCcw, FolderInput
} from 'lucide-react';
import { SEPARATION_MODES, getStemLabel } from '../../utils/stemFiles';
import { stemColor } from '../../utils/spectrum';

/**
 * Icons per stem key. Labels come from getStemLabel() so `other` reads as
 * "Instrumental" in two-stem mode.
 */
const STEM_ICONS = {
  vocals: Mic,
  drums: Disc,
  bass: Activity,
  guitar: Guitar,
  piano: Piano,
  other: Layers,
};

/**
 * Progress bar component for separation status
 */
function SeparationProgress({ progress, status, mode, quality, theme }) {
  const statusMessages = {
    uploading: 'Uploading audio...',
    processing: mode === 'vocals' ? 'Isolating vocals...' : 'Separating stems...',
    downloading: 'Downloading stems...',
  };
  // Measured: htdemucs_ft on a 2:40 track finished in ~35s on Replicate's GPU (plus upload + cold start)
  const eta = quality === 'best' && mode !== 'stems6'
    ? 'Fine-tuned model — usually 1-2 minutes including upload'
    : 'Usually under a minute including upload';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-mono ${theme === 'dark' ? 'text-[#9AA4B0]' : 'text-[#4B5563]'}`}>
          {statusMessages[status] || 'Processing...'}
        </span>
        <span className={`font-mono tabular-nums ${theme === 'dark' ? 'text-[#7C8794]' : 'text-[#6B7280]'}`}>{progress}%</span>
      </div>
      <div className={`h-1 overflow-hidden rounded-full ${theme === 'dark' ? 'bg-[#14171C]' : 'bg-[#EDEFF3]'}`}>
        <div
          className="h-full transition-all duration-300 bg-spectrum"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className={`font-mono text-[11px] text-center ${theme === 'dark' ? 'text-[#7C8794]' : 'text-[#6B7280]'}`}>
        {eta}
      </p>
    </div>
  );
}

/**
 * Small cloud badge showing whether a stem has been re-hosted on our storage
 */
function KeepBadge({ state, onKeep, label, theme, inverted }) {
  const muted = inverted ? 'opacity-70' : (theme === 'dark' ? 'text-[#7C8794]' : 'text-[#6B7280]');
  if (state === 'saved') {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${inverted ? 'opacity-80' : (theme === 'dark' ? 'text-[#34D399]' : 'text-[#059669]')}`} title="Saved permanently">
        <Cloud className="w-3 h-3" /> KEPT
      </span>
    );
  }
  if (state === 'saving') {
    return (
      <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${muted}`}>
        <Loader2 className="w-3 h-3 animate-spin" /> saving…
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onKeep(); }}
      className={`inline-flex items-center gap-1 font-mono text-[11px] hover:underline ${state === 'error' ? 'text-red-500' : muted}`}
      aria-label={`Keep ${label} stem permanently`}
      title={state === 'error' ? 'Save failed — click to retry' : 'Expires in ~7 days. Click to keep permanently.'}
    >
      <CloudOff className="w-3 h-3" /> {state === 'error' ? 'retry keep' : 'keep'}
    </button>
  );
}

/**
 * One row per stem: colour stripe, label, format / size, keep state, download.
 * Playback lives in the Stem Player below.
 */
function StemCard({ stemType, mode, isAvailable, isDownloaded, keepState, onDownload, onKeep, sizeBytes, theme, t }) {
  const IconComponent = STEM_ICONS[stemType] || Layers;
  const label = getStemLabel(stemType, mode);
  const color = stemColor(stemType);
  const isDark = theme === 'dark';

  return (
    <div
      className={`relative flex items-center gap-3 pl-5 pr-3 py-3 rounded-lg border ${
        isDark ? 'bg-[#0D0F12] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'
      } ${isAvailable ? '' : 'opacity-50'}`}
    >
      {/* Channel colour stripe — this stem's home in the spectrum */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r"
        style={{ background: color.gradient || color.hex }}
        aria-hidden="true"
      />
      <IconComponent className="w-4 h-4 flex-shrink-0" style={{ color: color.hex }} />
      <div className="flex-1 min-w-0">
        <div className={`font-display font-bold uppercase tracking-wide text-[13px] truncate ${t.text}`}>{label}</div>
        <div className={`font-mono text-[11px] ${t.textDimmed}`}>
          flac{sizeBytes ? ` · ${(sizeBytes / 1048576).toFixed(1)} MB` : isDownloaded ? '' : ' · remote'}
          {isAvailable && (
            <span className="ml-2 inline-flex">
              <KeepBadge state={keepState} onKeep={() => onKeep(stemType)} label={label} theme={theme} inverted={false} />
            </span>
          )}
        </div>
      </div>
      {isAvailable && (
        <button
          onClick={() => onDownload(stemType)}
          className={`px-2.5 py-2 rounded-md transition-colors ${t.button}`}
          aria-label={`Download ${label} stem`}
          title="Download FLAC (stamped with BPM + key)"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Segmented control for picking the separation mode before running
 */
function ModePicker({ mode, onChange, theme }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Separation mode">
      {SEPARATION_MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.id)}
            className={`text-left p-3 rounded-md border transition-colors ${
              active
                ? theme === 'dark'
                  ? 'border-ember-500 bg-[#14171C] text-[#E8ECF1] ring-signal'
                  : 'border-ember-600 bg-white text-[#0F1216] ring-signal'
                : theme === 'dark'
                  ? 'border-[#1C2027] bg-[#0D0F12] hover:border-[#2A3039] text-[#9AA4B0]'
                  : 'border-[#D9DDE3] bg-white hover:border-[#B8BEC7] text-[#4B5563]'
            }`}
          >
            <div className="font-display font-bold uppercase tracking-wide text-[12px]">{m.label}</div>
            <div className={`font-mono text-[11px] mt-1 ${theme === 'dark' ? 'text-[#7C8794]' : 'text-[#6B7280]'}`}>{m.description}</div>
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {m.stems.map((st) => (
                <span key={st} className="h-1 flex-1 rounded-full" style={{ background: stemColor(st).gradient || stemColor(st).hex, opacity: active ? 1 : 0.5 }} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * StemSelector component - UI for stem separation and selection
 */
export function StemSelector({
  // Stem separation state
  stems,
  stemTypes, // ordered list of available stem keys
  mode: resultMode, // mode that produced the current stems
  stemAudioData,
  separationStatus,
  separationProgress,
  separationError,
  keepStatus, // { [stemType]: 'saving' | 'saved' | 'error' }

  // Actions
  onSeparate, // callback({ mode, quality })
  onDownloadStem, // callback(stemType) — stamped single-file download
  onDownloadPack, // callback() — zip of all stems + notes.txt
  onSaveToLive, // callback() — helper writes stems into ~/Music/Remix Lab/Stems/ (null when helper offline)
  onKeepStem, // callback(stemType) — re-host on permanent storage
  onKeepAll,
  tempoLock, // <TempoLock> element — rendered under the toolbar (null when the helper is offline)
  onCancel,
  onReset, // start a new separation with a different mode

  // UI props
  hasAudio, // Whether source audio is loaded
  theme,
  t
}) {
  const [pickedMode, setPickedMode] = useState('vocals');
  const [quality, setQuality] = useState('best');
  const [isPacking, setIsPacking] = useState(false);
  const [isSavingToLive, setIsSavingToLive] = useState(false);

  const isProcessing = separationStatus === 'uploading' || separationStatus === 'processing';
  const isExpired = separationStatus === 'expired';
  const hasStems = stems !== null;
  const availableTypes = stemTypes && stemTypes.length
    ? stemTypes
    : (stems ? Object.keys(stems).filter(k => stems[k]) : []);
  const modeInfo = SEPARATION_MODES.find(m => m.id === resultMode) || SEPARATION_MODES[0];
  const keepStates = keepStatus || {};
  const allKept = availableTypes.length > 0 && availableTypes.every(k => keepStates[k] === 'saved');
  const anySaving = availableTypes.some(k => keepStates[k] === 'saving');

  const handleDownloadPack = async () => {
    if (!onDownloadPack || isPacking) return;
    setIsPacking(true);
    try {
      await onDownloadPack();
    } finally {
      setIsPacking(false);
    }
  };

  const handleSaveToLive = async () => {
    if (!onSaveToLive || isSavingToLive) return;
    setIsSavingToLive(true);
    try {
      await onSaveToLive();
    } finally {
      setIsSavingToLive(false);
    }
  };

  // Before separation - show mode picker + separate button
  if (!hasStems && !isProcessing) {
    return (
      <div className={`p-4 ${t.card}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-[#14171C] border border-[#1C2027]' : 'bg-[#EDEFF3] border border-[#D9DDE3]'}`}>
              <Scissors className="w-5 h-5 text-ember-500" />
            </div>
            <div>
              <h4 className={`font-display font-bold uppercase tracking-wide text-sm ${t.text}`}>Separate Stems</h4>
              <p className={`text-sm ${t.textMuted}`}>
                Lossless FLAC, stamped with BPM and key — drops straight into Live
              </p>
            </div>
          </div>
        </div>

        <ModePicker mode={pickedMode} onChange={setPickedMode} theme={theme} />

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          {/* Quality toggle — 6-stem only has one model */}
          <div className="flex items-center gap-2 text-xs">
            <span className={t.textMuted}>Quality</span>
            <div className={`inline-flex rounded-md overflow-hidden border ${theme === 'dark' ? 'border-[#1C2027]' : 'border-[#D9DDE3]'}`} role="radiogroup" aria-label="Separation quality">
              {[
                { id: 'best', label: 'Best' },
                { id: 'fast', label: 'Fast' },
              ].map(q => {
                const active = quality === q.id;
                const disabled = pickedMode === 'stems6';
                return (
                  <button
                    key={q.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => setQuality(q.id)}
                    className={`px-3 py-1.5 transition-colors disabled:opacity-50 ${
                      active
                        ? theme === 'dark' ? 'bg-[#1A1E25] text-[#E8ECF1]' : 'bg-[#0F1216] text-white'
                        : theme === 'dark' ? 'text-[#7C8794] hover:bg-[#14171C]' : 'text-[#6B7280] hover:bg-[#F5F6F8]'
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
            </div>
            <span className={t.textMuted}>
              {pickedMode === 'stems6' ? 'htdemucs_6s' : quality === 'best' ? 'htdemucs_ft · cleanest' : 'htdemucs · quicker'}
            </span>
          </div>

          <button
            onClick={() => onSeparate({ mode: pickedMode, quality })}
            disabled={!hasAudio}
            className={`px-4 py-2 font-medium text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              theme === 'dark'
                ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400'
                : 'bg-ember-600 text-white hover:bg-ember-700'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>{pickedMode === 'vocals' ? 'Grab Vocals' : 'Separate'}</span>
          </button>
        </div>

        {separationError && (
          <div className={`mt-3 p-3 rounded-md ${theme === 'dark' ? 'bg-red-950' : 'bg-red-50'}`}>
            <p className="text-sm text-red-500">{separationError}</p>
          </div>
        )}
      </div>
    );
  }

  // During separation - show progress
  if (isProcessing) {
    return (
      <div className={`p-4 ${t.card}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-[#14171C] border border-[#1C2027]' : 'bg-[#EDEFF3] border border-[#D9DDE3]'}`}>
              <Loader2 className="w-5 h-5 animate-spin text-ember-500" />
            </div>
            <div>
              <h4 className={`font-display font-bold uppercase tracking-wide text-sm ${t.text}`}>{pickedMode === 'vocals' ? 'Grabbing Vocals' : 'Separating Stems'}</h4>
              <p className={`text-sm ${t.textMuted}`}>
                Demucs · {SEPARATION_MODES.find(m => m.id === pickedMode)?.label}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className={`px-3 py-2 text-sm rounded-md transition-colors ${t.button}`}
            aria-label="Cancel separation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SeparationProgress progress={separationProgress} status={separationStatus} mode={pickedMode} quality={quality} theme={theme} />
      </div>
    );
  }

  // After separation - show stem rows
  const gridCols = availableTypes.length <= 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`p-4 ${t.card}`}>
      {/* Expired stems banner */}
      {isExpired && (
        <div className={`flex items-center gap-3 p-3 mb-4 rounded-lg ${
          theme === 'dark' ? 'bg-[#1A1400] border border-ember-700/60' : 'bg-ember-50 border border-ember-300'
        }`}>
          <Scissors className={`w-5 h-5 flex-shrink-0 ${theme === 'dark' ? 'text-ember-400' : 'text-ember-600'}`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-ember-300' : 'text-ember-700'}`}>
              Stems have expired
            </p>
            <p className={`text-xs ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`}>
              Unkept stems live on Replicate's CDN for ~7 days. Separate again to re-process.
            </p>
          </div>
          <button
            onClick={onReset}
            disabled={!hasAudio}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              theme === 'dark'
                ? 'bg-[#1A1E25] text-white hover:bg-[#242A33]'
                : 'bg-ember-600 text-white hover:opacity-90'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Re-separate
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-[#14171C] border border-[#1C2027]' : 'bg-[#EDEFF3] border border-[#D9DDE3]'}`}>
            <Check className="w-5 h-5 text-[#34D399]" />
          </div>
          <div>
            <h4 className={`font-display font-bold uppercase tracking-wide text-sm ${t.text}`}>{isExpired ? 'Stems Expired' : `${modeInfo.label} Ready`}</h4>
            <p className={`text-sm ${t.textMuted}`}>
              {isExpired
                ? 'Separate again to get them back'
                : allKept
                  ? 'Saved permanently — download any time'
                  : anySaving
                    ? 'Saving stems to your storage…'
                    : 'Download as FLAC or keep them permanently'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isExpired && !allKept && onKeepAll && (
            <button
              onClick={onKeepAll}
              disabled={anySaving}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md disabled:opacity-50 ${t.button}`}
              title="Re-host all stems on permanent storage"
            >
              {anySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
              <span className="hidden sm:inline">Keep all</span>
            </button>
          )}

          {!isExpired && onSaveToLive && (
            <button
              onClick={handleSaveToLive}
              disabled={isSavingToLive}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md disabled:opacity-50 ${t.button}`}
              title="Write the stems + notes.txt into ~/Music/Remix Lab/Stems/ so they show up in Live's browser"
            >
              {isSavingToLive ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderInput className="w-4 h-4" />}
              <span>{isSavingToLive ? 'Saving…' : 'To Live'}</span>
            </button>
          )}

          {!isExpired && onDownloadPack && (
            <button
              onClick={handleDownloadPack}
              disabled={isPacking}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-md disabled:opacity-50 ${
                theme === 'dark'
                  ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400'
                  : 'bg-ember-600 text-white hover:bg-ember-700'
              }`}
              title="Zip of all stems + notes.txt with BPM, key and Camelot info"
            >
              {isPacking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              <span>{isPacking ? 'Packing…' : 'Remix Pack'}</span>
            </button>
          )}

          {onReset && !isExpired && (
            <button
              onClick={onReset}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${t.button}`}
              aria-label="Start a new separation"
              title="Separate again with a different mode"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {tempoLock && <div className="mb-4">{tempoLock}</div>}

      {/* Stem cards grid */}
      <div className={`grid ${gridCols} gap-2`}>
        {availableTypes.map((stemType) => (
          <StemCard
            key={stemType}
            stemType={stemType}
            mode={resultMode}
            isAvailable={!!(stems && stems[stemType])}
            isDownloaded={!!stemAudioData[stemType]}
            keepState={keepStates[stemType]}
            sizeBytes={stemAudioData[stemType]?.byteLength}
            onDownload={onDownloadStem}
            onKeep={onKeepStem}
            theme={theme}
            t={t}
          />
        ))}
      </div>

      {separationError && (
        <div className={`mt-3 p-3 rounded-md ${theme === 'dark' ? 'bg-red-950' : 'bg-red-50'}`}>
          <p className="text-sm text-red-500">{separationError}</p>
        </div>
      )}
    </div>
  );
}
