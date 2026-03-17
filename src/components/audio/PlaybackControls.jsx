import { useState } from 'react';
import { Play, Pause, VolumeX, Volume1, Volume2 } from 'lucide-react';

/**
 * Audio playback controls with play/pause, progress bar, and volume.
 */
export function PlaybackControls({
  isPlaying,
  playbackTime,
  duration,
  volume,
  loopStart,
  loopEnd,
  loopEnabled,
  onTogglePlayback,
  onSeek,
  onVolumeChange,
  formatTime,
  theme,
  t
}) {
  const [showMobileVolume, setShowMobileVolume] = useState(false);

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="w-5 h-5" />;
    if (volume < 0.5) return <Volume1 className="w-5 h-5" />;
    return <Volume2 className="w-5 h-5" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onTogglePlayback}
          className={`w-12 h-12 sm:w-14 sm:h-14 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-md transition-colors flex-shrink-0 ${theme === 'dark' ? 'bg-white text-black hover:bg-stone-200' : 'bg-black text-white hover:bg-zinc-700'}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" fill="currentColor" />}
        </button>

        <div className="flex-1 min-w-0">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={playbackTime || 0}
            aria-label="Audio progress"
            className={`relative h-1 overflow-hidden cursor-pointer group rounded-full ${theme === 'dark' ? 'bg-zinc-700' : 'bg-stone-200'}`}
            onClick={onSeek}
          >
            {/* Loop region on progress bar */}
            {loopStart !== null && loopEnd !== null && duration > 0 && (
              <div
                className={`absolute top-0 bottom-0 ${loopEnabled ? 'bg-white/30' : 'bg-zinc-500/30'}`}
                style={{
                  left: `${(loopStart / duration) * 100}%`,
                  width: `${((loopEnd - loopStart) / duration) * 100}%`
                }}
              />
            )}
            <div
              className={`h-full transition-none pointer-events-none relative z-10 ${theme === 'dark' ? 'bg-white' : 'bg-black'}`}
              style={{ width: (duration > 0 ? (playbackTime / duration) * 100 : 0) + '%' }}
            >
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'bg-white' : 'bg-black'}`} />
            </div>
          </div>
          <div className={`flex justify-between mt-1.5 sm:mt-2 text-sm font-mono tabular-nums ${t.textMuted}`}>
            <span>{formatTime(playbackTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mobile Volume Button */}
        <button
          onClick={() => setShowMobileVolume(!showMobileVolume)}
          className={`sm:hidden p-2 min-w-[44px] min-h-[44px] transition-colors ${t.button} flex items-center justify-center`}
          aria-label="Volume"
        >
          {getVolumeIcon()}
        </button>

        {/* Desktop Volume Control */}
        <div className="hidden sm:flex items-center gap-2 ml-2 sm:ml-4">
          <button
            onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
            className={`p-2 min-w-[44px] min-h-[44px] transition-colors ${t.button} flex items-center justify-center`}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {getVolumeIcon()}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-20 sm:w-24 h-1 appearance-none cursor-pointer"
            aria-label="Volume"
            style={{
              background: `linear-gradient(to right, ${theme === 'dark' ? '#ffffff' : '#000000'} 0%, ${theme === 'dark' ? '#ffffff' : '#000000'} ${volume * 100}%, ${theme === 'dark' ? '#3f3f46' : '#e7e5e4'} ${volume * 100}%, ${theme === 'dark' ? '#3f3f46' : '#e7e5e4'} 100%)`
            }}
          />
        </div>
      </div>

      {/* Mobile Volume Slider - expands below controls */}
      {showMobileVolume && (
        <div className={`sm:hidden flex items-center gap-3 p-3 ${t.card}`}>
          <button
            onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
            className={`p-2 min-w-[44px] min-h-[44px] transition-colors ${t.button} flex items-center justify-center`}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {getVolumeIcon()}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 appearance-none cursor-pointer"
            aria-label="Volume"
            style={{
              background: `linear-gradient(to right, ${theme === 'dark' ? '#ffffff' : '#000000'} 0%, ${theme === 'dark' ? '#ffffff' : '#000000'} ${volume * 100}%, ${theme === 'dark' ? '#3f3f46' : '#e7e5e4'} ${volume * 100}%, ${theme === 'dark' ? '#3f3f46' : '#e7e5e4'} 100%)`
            }}
          />
          <span className={`text-sm font-medium min-w-[3ch] text-right ${t.textMuted}`}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
