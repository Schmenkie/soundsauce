import { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, Loader2, Pause, Play, Music } from 'lucide-react';

const SC_WIDGET_API = 'https://w.soundcloud.com/player/api.js';

// Load SoundCloud Widget API script once globally
let widgetApiPromise = null;
function loadWidgetApi() {
  if (widgetApiPromise) return widgetApiPromise;
  if (window.SC?.Widget) return Promise.resolve();
  widgetApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SC_WIDGET_API;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return widgetApiPromise;
}

function formatTime(ms) {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * EQ visualizer bars — animated when playing, static when paused.
 * 5 bars with staggered CSS animations.
 */
function EQBars({ playing, dark }) {
  const barCount = 5;
  const heights = [60, 85, 45, 75, 55]; // base heights %
  const delays = [0, 0.15, 0.3, 0.1, 0.25]; // animation delay seconds

  return (
    <div className="flex items-end gap-[2px] h-5">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: playing ? undefined : `${heights[i]}%`,
            background: dark
              ? 'linear-gradient(to top, #f59e0b, #fbbf24)'
              : 'linear-gradient(to top, #d97706, #f59e0b)',
            animation: playing
              ? `eq-bounce 0.8s ease-in-out ${delays[i]}s infinite alternate`
              : 'none',
            minHeight: 3,
          }}
        />
      ))}
    </div>
  );
}

/**
 * SoundCloud player for profile anthems — immersive card design.
 * Album art blurred background, glassmorphic overlay, spinning vinyl,
 * animated EQ bars, clickable progress bar, ambient glow when playing.
 */
export function SoundCloudEmbed({ url, theme }) {
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const animRef = useRef(null);
  const rotationRef = useRef(0);
  const lastTimeRef = useRef(null);
  const vinylRef = useRef(null);
  const progressBarRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const embedSrc = url
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&show_artwork=false&show_comments=false&show_playcount=false&show_user=false&visual=false`
    : '';

  const handleIframeLoad = useCallback(async () => {
    if (!iframeRef.current) return;
    try {
      await loadWidgetApi();
      const widget = window.SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      widget.bind(window.SC.Widget.Events.READY, () => {
        setLoading(false);
        widget.getCurrentSound((sound) => {
          if (sound) {
            setTrackTitle(sound.title || '');
            setTrackArtist(sound.user?.username || '');
            setDuration(sound.duration || 0);
            if (sound.artwork_url) {
              setArtworkUrl(sound.artwork_url.replace('-large', '-t500x500'));
            }
          }
        });
      });

      widget.bind(window.SC.Widget.Events.PLAY, () => setPlaying(true));
      widget.bind(window.SC.Widget.Events.PAUSE, () => setPlaying(false));
      widget.bind(window.SC.Widget.Events.FINISH, () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });
      widget.bind(window.SC.Widget.Events.PLAY_PROGRESS, (data) => {
        setCurrentTime(data.currentPosition || 0);
        if (duration > 0) {
          setProgress(data.currentPosition / duration);
        }
      });
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [url, duration]);

  // Vinyl spin animation
  useEffect(() => {
    if (playing) {
      lastTimeRef.current = performance.now();
      const spin = (now) => {
        const delta = now - (lastTimeRef.current || now);
        lastTimeRef.current = now;
        rotationRef.current = (rotationRef.current + (delta / 1818) * 360) % 360;
        if (vinylRef.current) {
          vinylRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
        }
        animRef.current = requestAnimationFrame(spin);
      };
      animRef.current = requestAnimationFrame(spin);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing]);

  const togglePlay = () => {
    if (!widgetRef.current) return;
    widgetRef.current.toggle();
  };

  const handleProgressClick = (e) => {
    if (!widgetRef.current || !duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    widgetRef.current.seekTo(ratio * duration);
  };

  if (!url) return null;

  const dark = theme === 'dark';

  // Loading skeleton
  if (loading) {
    return (
      <div className={`rounded-2xl overflow-hidden border ${
        dark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-stone-100/80 border-stone-200'
      }`}>
        <iframe
          ref={iframeRef}
          src={embedSrc}
          onLoad={handleIframeLoad}
          allow="autoplay"
          style={{ position: 'absolute', width: 0, height: 0, border: 'none', opacity: 0, pointerEvents: 'none' }}
          title="SoundCloud Player"
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={`w-12 h-12 rounded-full ${dark ? 'bg-zinc-800' : 'bg-stone-200'} animate-pulse`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3 w-32 rounded ${dark ? 'bg-zinc-800' : 'bg-stone-200'} animate-pulse`} />
            <div className={`h-2 w-20 rounded ${dark ? 'bg-zinc-800' : 'bg-stone-200'} animate-pulse`} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`rounded-2xl overflow-hidden border px-4 py-3 ${
        dark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-stone-100/80 border-stone-200'
      }`}>
        <div className="flex items-center gap-3">
          <Music className={`w-5 h-5 ${dark ? 'text-zinc-600' : 'text-stone-400'}`} />
          <p className={`text-sm ${dark ? 'text-zinc-400' : 'text-stone-500'}`}>Could not load track</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`ml-auto flex items-center gap-1 text-xs font-medium ${
              dark ? 'text-ember-500 hover:text-ember-400' : 'text-ember-600 hover:text-ember-700'
            }`}
          >
            Open on SoundCloud <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden group">
      {/* Hidden SoundCloud iframe */}
      <iframe
        ref={iframeRef}
        src={embedSrc}
        onLoad={handleIframeLoad}
        allow="autoplay"
        style={{ position: 'absolute', width: 0, height: 0, border: 'none', opacity: 0, pointerEvents: 'none' }}
        title="SoundCloud Player"
      />

      {/* Ambient glow when playing */}
      {playing && (
        <div
          className="absolute -inset-1 rounded-2xl opacity-40 blur-xl transition-opacity duration-700 pointer-events-none"
          style={{
            background: dark
              ? 'linear-gradient(135deg, #f59e0b33, #f59e0b11, #f59e0b22)'
              : 'linear-gradient(135deg, #d9770633, #d9770611, #d9770622)',
          }}
        />
      )}

      {/* Background: blurred album art or gradient fallback */}
      <div className="absolute inset-0">
        {artworkUrl ? (
          <>
            <img
              src={artworkUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                background: dark
                  ? 'rgba(9, 9, 11, 0.78)'
                  : 'rgba(250, 250, 249, 0.82)',
              }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: dark
                ? 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)'
                : 'linear-gradient(135deg, #f5f5f4 0%, #e7e5e4 50%, #f5f5f4 100%)',
            }}
          />
        )}
      </div>

      {/* Border overlay */}
      <div className={`absolute inset-0 rounded-2xl border pointer-events-none ${
        dark ? 'border-zinc-700/50' : 'border-stone-200/80'
      }`} />

      {/* Content */}
      <div className="relative flex items-center gap-4 px-4 py-3.5">
        {/* Vinyl record with artwork */}
        <button
          onClick={togglePlay}
          className="relative flex-shrink-0 cursor-pointer group/vinyl"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {/* Vinyl disc */}
          <div
            ref={vinylRef}
            className="w-14 h-14 rounded-full relative"
            style={{
              background: dark
                ? `conic-gradient(from 0deg, #27272a, #3f3f46, #27272a, #18181b, #3f3f46, #27272a, #3f3f46, #18181b, #27272a)`
                : `conic-gradient(from 0deg, #333, #555, #333, #222, #555, #333, #555, #222, #333)`,
              boxShadow: playing
                ? (dark ? '0 0 20px rgba(245, 158, 11, 0.15)' : '0 0 20px rgba(217, 119, 6, 0.12)')
                : 'none',
              transition: 'box-shadow 0.5s ease',
            }}
          >
            {/* Groove rings */}
            <div className="absolute inset-[3px] rounded-full" style={{
              border: `1px solid ${dark ? 'rgba(63,63,70,0.5)' : 'rgba(100,100,100,0.3)'}`,
            }} />
            <div className="absolute inset-[6px] rounded-full" style={{
              border: `1px solid ${dark ? 'rgba(63,63,70,0.3)' : 'rgba(100,100,100,0.2)'}`,
            }} />
            <div className="absolute inset-[9px] rounded-full" style={{
              border: `1px solid ${dark ? 'rgba(63,63,70,0.4)' : 'rgba(100,100,100,0.25)'}`,
            }} />

            {/* Center label — album art or accent circle */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full overflow-hidden"
              style={{
                boxShadow: `0 0 0 1px ${dark ? '#3f3f46' : '#666'}`,
              }}
            >
              {artworkUrl ? (
                <img src={artworkUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{ background: dark ? '#f59e0b' : '#d97706' }} />
              )}
            </div>

            {/* Spindle hole */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{ background: dark ? '#09090b' : '#fafaf9' }}
            />
          </div>

          {/* Play/Pause overlay */}
          <div className={`absolute inset-0 flex items-center justify-center rounded-full transition-opacity duration-200 ${
            'opacity-0 group-hover/vinyl:opacity-100'
          } bg-black/40 backdrop-blur-[2px]`}>
            {playing ? (
              <Pause className="w-5 h-5 text-white drop-shadow-md" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5 drop-shadow-md" />
            )}
          </div>
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row */}
          <div className="flex items-center gap-2 min-w-0">
            <EQBars playing={playing} dark={dark} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-stone-900'}`}>
                {trackTitle || 'Untitled'}
              </p>
              <p className={`text-xs truncate ${dark ? 'text-zinc-400' : 'text-stone-500'}`}>
                {trackArtist}
              </p>
            </div>
          </div>

          {/* Progress bar — clickable */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono tabular-nums w-8 text-right ${
              dark ? 'text-zinc-500' : 'text-stone-400'
            }`}>
              {formatTime(currentTime)}
            </span>
            <div
              ref={progressBarRef}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={currentTime || 0}
              aria-label="Audio progress"
              onClick={handleProgressClick}
              className={`flex-1 h-1.5 rounded-full cursor-pointer group/progress relative ${
                dark ? 'bg-zinc-700/60' : 'bg-stone-300/60'
              }`}
            >
              <div
                className="h-full rounded-full relative transition-[width] duration-150"
                style={{
                  width: `${Math.min(progress * 100, 100)}%`,
                  background: dark
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, #d97706, #f59e0b)',
                }}
              >
                {/* Scrubber dot — visible on hover */}
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity ${
                  dark ? 'bg-ember-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]' : 'bg-ember-600 shadow-[0_0_6px_rgba(217,119,6,0.3)]'
                }`} />
              </div>
            </div>
            <span className={`text-[10px] font-mono tabular-nums w-8 ${
              dark ? 'text-zinc-500' : 'text-stone-400'
            }`}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* SoundCloud link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
            dark
              ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              : 'text-stone-400 hover:text-stone-600 hover:bg-stone-200/50'
          }`}
          title="Open on SoundCloud"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
