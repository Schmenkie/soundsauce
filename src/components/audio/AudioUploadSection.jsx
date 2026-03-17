// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { Upload, Play, Music } from 'lucide-react';

/**
 * Audio upload section with drag-drop support, animated border, and demo sound button.
 * When showWelcome is true, renders an expanded welcome banner for first-time users
 * with pulsing waveform icon, animated dashed border, and staggered button entrance.
 */
export function AudioUploadSection({
  isDragging,
  onFileUpload,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onLoadDemo,
  isLoadingDemo,
  showWelcome,
  dropZoneRef,
  theme,
  t
}) {
  const isDark = theme === 'dark';

  return (
    <div
      ref={dropZoneRef}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative p-6 mb-6 rounded-lg group"
    >
      {/* Animated gradient border */}
      <div
        className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
          isDragging ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'
        }`}
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(217,119,6,0.1), rgba(245,158,11,0.4))'
            : 'linear-gradient(135deg, rgba(217,119,6,0.3), rgba(217,119,6,0.05), rgba(217,119,6,0.3))',
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Inner background */}
      <div className={`absolute inset-[1px] rounded-[7px] ${
        isDragging
          ? isDark ? 'bg-ember-500/[0.08]' : 'bg-amber-50'
          : isDark ? 'bg-zinc-900' : 'bg-white'
      } transition-colors duration-300`} />

      {/* Content */}
      <div className="relative z-10">
        {isDragging ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Upload className={`w-16 h-16 mb-4 ${isDark ? 'text-ember-500' : 'text-ember-600'}`} />
            </motion.div>
            <p className={`text-xl font-medium font-display ${t.text}`}>Drop your audio file here</p>
          </motion.div>
        ) : showWelcome ? (
          /* Expanded welcome banner for new / first-time users */
          <div className="flex flex-col items-center text-center py-4 sm:py-6">
            {/* Animated waveform icon */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className={`w-14 h-14 flex items-center justify-center rounded-xl mb-4 ${
                isDark ? 'bg-ember-500/15' : 'bg-amber-50'
              }`}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <g stroke={isDark ? '#f59e0b' : '#d97706'} strokeWidth="2.4" strokeLinecap="round" fill="none">
                    <line x1="4" y1="12" x2="4" y2="20"/>
                    <line x1="9" y1="8" x2="9" y2="24"/>
                    <line x1="14" y1="5" x2="14" y2="27"/>
                    <line x1="19" y1="9" x2="19" y2="23"/>
                    <line x1="24" y1="11" x2="24" y2="21"/>
                    <line x1="29" y1="13" x2="29" y2="19"/>
                  </g>
                </svg>
              </motion.div>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-lg sm:text-xl font-bold font-display mb-1.5 ${t.text}`}
            >
              Upload a sound or try our demo
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`text-sm mb-6 max-w-md ${t.textMuted}`}
            >
              Drop in any audio file to analyze it, or load a demo synth sound to see how it works.
            </motion.p>

            {/* Button row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md"
            >
              {/* Upload button */}
              <label className="flex-1 w-full sm:w-auto cursor-pointer">
                <div className={`flex items-center justify-center gap-3 px-6 py-3.5 min-h-[48px] transition-all font-medium rounded-md ${
                  isDark
                    ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                    : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}>
                  <Upload className="w-5 h-5 flex-shrink-0" />
                  <span>Upload Audio</span>
                </div>
                <input type="file" accept=".wav,.mp3,.m4a,audio/wav,audio/x-wav,audio/wave,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a" onChange={onFileUpload} className="hidden" />
              </label>

              {/* Demo button */}
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  disabled={isLoadingDemo}
                  className={`flex-1 w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 min-h-[48px] transition-all font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                  aria-label="Load demo synth sound"
                >
                  <Play className="w-5 h-5 flex-shrink-0" />
                  <span>{isLoadingDemo ? 'Generating...' : 'Try Demo Sound'}</span>
                </button>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`text-xs mt-4 ${t.textDimmed}`}
            >
              Supports WAV, MP3, and M4A
            </motion.p>
          </div>
        ) : (
          /* Standard compact upload section (audio already loaded or returning user) */
          <>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="w-full sm:w-auto max-w-md cursor-pointer">
                <div className={`flex items-center justify-center gap-3 px-8 py-4 min-h-[52px] transition-all font-medium rounded-md ${
                  isDark
                    ? 'bg-ember-500 text-zinc-950 hover:bg-ember-600'
                    : 'bg-ember-600 text-white hover:bg-ember-700'
                }`}>
                  <Upload className="w-5 h-5 flex-shrink-0" />
                  <span>Upload Audio</span>
                </div>
                <input type="file" accept=".wav,.mp3,.m4a,audio/wav,audio/x-wav,audio/wave,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a" onChange={onFileUpload} className="hidden" />
              </label>

              {/* Demo button in compact mode too */}
              {onLoadDemo && (
                <button
                  onClick={onLoadDemo}
                  disabled={isLoadingDemo}
                  className={`flex items-center justify-center gap-2 px-5 py-4 min-h-[52px] transition-all font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                    isDark
                      ? 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                  aria-label="Load demo synth sound"
                >
                  <Play className="w-4 h-4 flex-shrink-0" />
                  <span>{isLoadingDemo ? 'Generating...' : 'Try Demo'}</span>
                </button>
              )}
            </div>
            <p className={`text-center ${t.textDimmed} text-xs sm:text-sm mt-3 sm:mt-4`}>
              Upload an audio file or drag and drop
            </p>
          </>
        )}
      </div>
    </div>
  );
}
