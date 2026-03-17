import { useRef } from 'react';
import { Upload, Loader, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const RECREATION_STEPS = [
  { label: 'Upload', threshold: 30 },
  { label: 'Decode', threshold: 60 },
  { label: 'Compare', threshold: 85 },
  { label: 'Save', threshold: 100 },
];

/**
 * Returns 'completed', 'active', or 'pending' for a given step based on progress.
 */
function getStepStatus(stepIndex, progress) {
  const step = RECREATION_STEPS[stepIndex];
  const prevThreshold = stepIndex > 0 ? RECREATION_STEPS[stepIndex - 1].threshold : 0;

  if (progress >= step.threshold) return 'completed';
  if (progress >= prevThreshold) return 'active';
  return 'pending';
}

/**
 * Upload dropzone for recreation audio on RecipeDetail page.
 * Shows file picker, progress during upload/analysis, and result.
 */
export function RecreationUpload({ onUpload, isProcessing, progress, theme }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  }

  if (!user) {
    return (
      <div className={`p-6 border-2 border-dashed text-center rounded-lg ${
        theme === 'dark' ? 'border-zinc-700' : 'border-stone-200'
      }`}>
        <p className={`text-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'}`}>
          Sign in to upload your recreation attempt
        </p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className={`p-6 border text-center rounded-lg ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
      }`}>
        {/* Step progress indicator */}
        <div className="flex items-start justify-center mb-6 px-4">
          {RECREATION_STEPS.map((step, i) => {
            const status = getStepStatus(i, progress);
            const isLast = i === RECREATION_STEPS.length - 1;

            return (
              <div key={step.label} className="flex items-start" style={{ flex: isLast ? '0 0 auto' : '1 1 0' }}>
                {/* Step circle + label */}
                <div className="flex flex-col items-center" style={{ width: 40 }}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      status === 'completed'
                        ? theme === 'dark'
                          ? 'bg-white text-black'
                          : 'bg-ember-600 text-white'
                        : status === 'active'
                          ? theme === 'dark'
                            ? 'bg-white text-black'
                            : 'bg-ember-600 text-white'
                          : theme === 'dark'
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : status === 'active' ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-xs mt-1.5 ${
                    status === 'active'
                      ? theme === 'dark' ? 'text-white font-bold' : 'text-ember-600 font-bold'
                      : status === 'completed'
                        ? theme === 'dark' ? 'text-white' : 'text-stone-900'
                        : theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'
                  }`}>
                    {step.label}
                  </span>
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div className="flex-1 pt-4 px-1">
                    <div
                      className={`h-0.5 w-full rounded-full ${
                        status === 'completed'
                          ? theme === 'dark'
                            ? 'bg-white'
                            : 'bg-ember-600'
                          : theme === 'dark'
                            ? 'bg-zinc-800'
                            : 'bg-stone-200'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-100'}`}>
          <div
            className={`h-full rounded-full transition-all ${
              theme === 'dark' ? 'bg-white' : 'bg-ember-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`w-full p-6 border-2 border-dashed text-center rounded-lg transition-colors ${
          theme === 'dark'
            ? 'border-zinc-700 hover:border-zinc-500'
            : 'border-stone-200 hover:border-ember-600'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${
          theme === 'dark' ? 'text-zinc-500' : 'text-ember-600'
        }`} />
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>
          Upload your recreation
        </p>
        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-zinc-500' : 'text-stone-400'}`}>
          MP3, WAV, FLAC, OGG, M4A (max 100MB)
        </p>
      </button>
    </div>
  );
}
