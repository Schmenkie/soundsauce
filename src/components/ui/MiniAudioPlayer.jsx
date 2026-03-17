import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Music } from 'lucide-react';

/**
 * Mini audio player for profile anthems.
 * Compact, inline design inspired by Instagram's music sticker.
 */
export function MiniAudioPlayer({ url, title, artist, theme }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const animRef = useRef(null);
  const playingRef = useRef(false);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    function tick() {
      if (audioRef.current) {
        const { currentTime, duration } = audioRef.current;
        if (duration > 0) {
          setProgress(currentTime / duration);
        }
      }
      if (playingRef.current) {
        animRef.current = requestAnimationFrame(tick);
      }
    }

    if (playing) {
      animRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing]);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = fraction * duration;
    setProgress(fraction);
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const t = theme === 'dark' ? {
    bg: 'bg-zinc-900 border-zinc-700',
    text: 'text-white',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    progressBg: 'bg-zinc-700',
    progressFill: 'bg-ember-500',
    iconBg: 'bg-zinc-800',
    buttonBg: 'bg-zinc-800 hover:bg-zinc-700 text-white',
  } : {
    bg: 'bg-amber-50/50 border-stone-200',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    progressBg: 'bg-stone-200',
    progressFill: 'bg-ember-600',
    iconBg: 'bg-amber-50',
    buttonBg: 'bg-ember-600 hover:bg-ember-700 text-white',
  };

  return (
    <div className={`flex items-center gap-3 p-3 border rounded-lg ${t.bg}`}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Music icon */}
      <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${t.iconBg}`}>
        <Music className={`w-5 h-5 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
      </div>

      {/* Info + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${t.text}`}>
              {title || 'Untitled'}
            </p>
            {artist && (
              <p className={`text-xs truncate ${t.textMuted}`}>{artist}</p>
            )}
          </div>
          <div className={`text-xs flex-shrink-0 ${t.textDimmed}`}>
            {formatTime(duration > 0 ? progress * duration : 0)} / {formatTime(duration)}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className={`h-1 mt-2 rounded-full cursor-pointer ${t.progressBg}`}
          onClick={handleProgressClick}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${t.progressFill}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-colors ${t.buttonBg}`}
      >
        {playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
    </div>
  );
}
