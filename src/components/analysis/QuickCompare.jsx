import { useState, useRef, useCallback } from 'react';
import { Upload, ChevronDown, ChevronUp, RotateCcw, Loader2 } from 'lucide-react';
import { useAudioWorker } from '../../hooks';
import { RecreationResult } from '../recipe/RecreationResult';

/**
 * QuickCompare — client-side recreation comparison for the Analyze page.
 * Unlike the full useRecreation hook (which saves to Supabase), this runs
 * entirely in the browser: decode both files → Web Worker spectral match → display.
 * No auth required, no uploads, instant results.
 *
 * @param {Object} props
 * @param {ArrayBuffer} props.audioFileData - Original audio file data
 * @param {number} props.sampleRate - Sample rate of the original audio
 * @param {string} props.theme - 'dark' | 'light'
 * @param {Object} props.t - Theme classes object
 */
export function QuickCompare({ audioFileData, sampleRate, theme, t }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | decoding | comparing | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const worker = useAudioWorker();

  const handleFileSelect = useCallback(async (file) => {
    if (!file || !audioFileData) return;

    // Validate file type
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|m4a)$/i)) {
      setError('Please upload a WAV, MP3, or M4A file.');
      return;
    }

    setError(null);
    setResult(null);
    setStatus('decoding');

    let ctx;
    try {
      // Read the recreation file
      const recreationBuffer = await file.arrayBuffer();

      // Decode both audio files
      ctx = new AudioContext({ sampleRate: sampleRate || 44100 });

      const [originalDecoded, recreationDecoded] = await Promise.all([
        ctx.decodeAudioData(audioFileData.slice(0)),
        ctx.decodeAudioData(recreationBuffer),
      ]);

      const originalData = originalDecoded.getChannelData(0);
      const recreationData = recreationDecoded.getChannelData(0);

      setStatus('comparing');

      // Run spectral match via Web Worker
      const matchResult = await worker.calculateSpectralMatch(
        originalData,
        recreationData,
        originalDecoded.sampleRate
      );

      setResult({
        match_score: matchResult.overallMatch,
        matchResult,
      });
      setStatus('done');
    } catch (err) {
      console.error('QuickCompare error:', err);
      setError('Could not compare audio files. Make sure both files are valid audio.');
      setStatus('error');
    } finally {
      if (ctx) {
        try { ctx.close(); } catch { /* ignore close error */ }
      }
    }
  }, [audioFileData, sampleRate, worker]);

  const handleReset = useCallback(() => {
    setResult(null);
    setStatus('idle');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div id="quick-compare-section" className={`border rounded-lg overflow-hidden ${
      theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
    }`}>
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-amber-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Upload className={`w-4 h-4 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
          <span className={`text-sm font-semibold ${t.text}`}>Compare Your Recreation</span>
          {result && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              result.match_score >= 80 ? 'bg-green-500/20 text-green-500' :
              result.match_score >= 60 ? 'bg-orange-500/20 text-orange-500' :
              'bg-red-500/20 text-red-500'
            }`}>
              {Math.round(result.match_score)}% match
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${t.textMuted}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${t.textMuted}`} />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className={`px-4 pb-4 border-t ${theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'}`}>

          {/* Description */}
          <p className={`text-xs mt-3 mb-3 ${t.textMuted}`}>
            Upload your recreation attempt and instantly see how close it matches the original sound.
          </p>

          {/* Upload area — only when idle or error */}
          {(status === 'idle' || status === 'error') && (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                theme === 'dark'
                  ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                  : 'border-stone-200 hover:border-ember-600 hover:bg-amber-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={`w-6 h-6 mx-auto mb-2 ${t.textMuted}`} />
              <p className={`text-sm font-medium ${t.text}`}>
                Drop your recreation here or click to browse
              </p>
              <p className={`text-xs mt-1 ${t.textMuted}`}>
                WAV, MP3, or M4A
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".wav,.mp3,.m4a,audio/wav,audio/mpeg,audio/mp4"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          )}

          {/* Processing state */}
          {(status === 'decoding' || status === 'comparing') && (
            <div className={`p-6 text-center rounded-lg ${theme === 'dark' ? 'bg-zinc-950' : 'bg-stone-100'}`}>
              <Loader2 className={`w-6 h-6 mx-auto mb-2 animate-spin ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
              <p className={`text-sm ${t.text}`}>
                {status === 'decoding' ? 'Decoding audio files...' : 'Comparing spectral characteristics...'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={`p-3 rounded-lg text-xs mt-2 ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              {error}
            </div>
          )}

          {/* Results */}
          {status === 'done' && result && (
            <div className="mt-3 space-y-3">
              <RecreationResult result={result} theme={theme} />
              <button
                onClick={handleReset}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                    : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                Try another file
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
