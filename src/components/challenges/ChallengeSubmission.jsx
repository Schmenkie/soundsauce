import { useCallback, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Upload dropzone + result display for challenge submissions.
 * Auth gate + active gate. Re-submit button for improving score.
 * Pattern: RecreationUpload.jsx + RecreationResult.jsx
 */
export function ChallengeSubmission({
  challengeStatus,
  referenceAudioUrl,
  challengeId,
  status,
  progress,
  result,
  error,
  onSubmit,
  onReset,
  isProcessing,
  theme,
}) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const dark = theme === 'dark';

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file || !referenceAudioUrl) return;
    onSubmit(challengeId, referenceAudioUrl, file);
    e.target.value = '';
  }, [challengeId, referenceAudioUrl, onSubmit]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !referenceAudioUrl) return;
    onSubmit(challengeId, referenceAudioUrl, file);
  }, [challengeId, referenceAudioUrl, onSubmit]);

  // Not signed in
  if (!user) {
    return (
      <div className={`p-6 border-2 border-dashed rounded-lg text-center ${
        dark ? 'border-zinc-700' : 'border-stone-200'
      }`}>
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
        <p className={`text-sm ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
          Sign in to submit your recreation
        </p>
      </div>
    );
  }

  // Challenge not active
  if (challengeStatus !== 'active') {
    return (
      <div className={`p-6 border-2 border-dashed rounded-lg text-center ${
        dark ? 'border-zinc-700' : 'border-stone-200'
      }`}>
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
        <p className={`text-sm ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
          {challengeStatus === 'upcoming' ? 'This challenge hasn\'t started yet' : 'This challenge has ended'}
        </p>
      </div>
    );
  }

  // No reference audio
  if (!referenceAudioUrl) {
    return (
      <div className={`p-6 border-2 border-dashed rounded-lg text-center ${
        dark ? 'border-zinc-700' : 'border-stone-200'
      }`}>
        <AlertCircle className={`w-8 h-8 mx-auto mb-3 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
        <p className={`text-sm ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
          No reference audio available for this challenge
        </p>
      </div>
    );
  }

  // Show result
  if (status === 'done' && result) {
    const score = Math.round(result.match_score || result.matchResult?.overallMatch || 0);

    return (
      <div className={`p-6 border rounded-lg ${
        dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className={`text-sm font-medium ${dark ? 'text-white' : 'text-stone-900'}`}>
              Submission complete!
            </span>
          </div>
          <button
            onClick={onReset}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              dark
                ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
            Re-submit
          </button>
        </div>

        {/* Score display */}
        <div className="text-center py-4">
          <p className={`text-5xl font-bold ${
            score >= 90
              ? 'text-emerald-500'
              : score >= 70
                ? dark ? 'text-ember-500' : 'text-ember-600'
                : dark ? 'text-zinc-400' : 'text-stone-500'
          }`}>
            {score}%
          </p>
          <p className={`text-sm mt-1 ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
            Match Score
          </p>
        </div>

        {/* Band scores */}
        {result.matchResult?.bandDifferences && (
          <div className="space-y-2 mt-4">
            {Object.entries(result.matchResult.bandDifferences).map(([band, diff]) => {
              const similarity = Math.max(0, 100 - Math.abs(diff || 0) * 100);
              return (
                <div key={band} className="flex items-center gap-2">
                  <span className={`text-xs w-16 text-right ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
                    {band}
                  </span>
                  <div className={`flex-1 h-2 rounded-full ${dark ? 'bg-zinc-700' : 'bg-stone-100'}`}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${similarity}%`,
                        background: dark
                          ? similarity >= 80 ? '#4ade80' : '#F59E0B'
                          : similarity >= 80 ? '#22c55e' : '#D97706',
                      }}
                    />
                  </div>
                  <span className={`text-xs w-8 ${dark ? 'text-zinc-400' : 'text-stone-500'}`}>
                    {Math.round(similarity)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Show error
  if (status === 'error') {
    return (
      <div className={`p-6 border rounded-lg text-center ${
        dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
      }`}>
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
        <p className={`text-sm mb-3 ${dark ? 'text-zinc-400' : 'text-stone-500'}`}>
          {error || 'Something went wrong'}
        </p>
        <button
          onClick={onReset}
          className={`text-sm font-medium px-4 py-2 rounded-md ${
            dark
              ? 'bg-zinc-800 text-white hover:bg-zinc-700'
              : 'bg-ember-600 text-white hover:bg-ember-700'
          }`}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Processing state
  if (isProcessing) {
    return (
      <div className={`p-6 border rounded-lg text-center ${
        dark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
      }`}>
        <Loader2 className={`w-8 h-8 mx-auto mb-3 animate-spin ${
          dark ? 'text-ember-500' : 'text-ember-600'
        }`} />
        <p className={`text-sm mb-3 ${dark ? 'text-white' : 'text-stone-900'}`}>
          {status === 'uploading' ? 'Uploading audio...' :
           status === 'analyzing' ? 'Analyzing spectral match...' :
           'Saving results...'}
        </p>
        {/* Progress bar */}
        <div className={`h-2 rounded-full mx-auto max-w-xs ${dark ? 'bg-zinc-700' : 'bg-stone-100'}`}>
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${progress}%`,
              background: dark ? '#F59E0B' : '#D97706',
            }}
          />
        </div>
      </div>
    );
  }

  // Default: upload dropzone
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
        dark
          ? 'border-zinc-700 hover:border-zinc-500'
          : 'border-stone-200 hover:border-ember-600'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Upload className={`w-8 h-8 mx-auto mb-3 ${dark ? 'text-zinc-500' : 'text-stone-400'}`} />
      <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-stone-900'}`}>
        Upload your recreation
      </p>
      <p className={`text-xs mt-1 ${dark ? 'text-zinc-500' : 'text-stone-400'}`}>
        Drop an audio file or click to browse
      </p>
    </div>
  );
}
