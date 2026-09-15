import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { spectrumColor, spectrumRgb } from '../../utils/spectrum';

/** How much spectrum colour shows through on the unplayed waveform (0 = plain grey) */
const UNPLAYED_SPECTRUM_MIX = 0.35;
import { ZoomIn, ZoomOut, Repeat, X, RotateCcw } from 'lucide-react';

// Zoom snap levels for button controls
const ZOOM_SNAPS = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];

/**
 * Canvas-based waveform display with deep zoom, mirrored rendering,
 * minimap scrollbar, and 60fps playhead animation.
 */
export function WaveformVisualizer({
  waveformData,
  waveformHiResRef,
  waveformColorRef, // { colors: Float32Array (t per column, -1 = silence), numColumns } — Signal Deck colouring
  duration,
  playbackTime,
  playbackTimeRef,
  loopStart,
  loopEnd,
  loopEnabled,
  onToggleLoop,
  onClearLoop,
  onSeek,
  onLoopRegionChange,
  formatTime,
  theme,
  t
}) {
  // Zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0); // 0-1 fraction of duration

  // Interaction state
  const [dragMode, setDragMode] = useState(null);
  const dragStartRef = useRef(null);
  const dragLoopRef = useRef(null);

  // Canvas refs
  const containerRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const minimapContainerRef = useRef(null);

  // Minimap drag ref
  const minimapDragRef = useRef(null);

  // Animation refs
  const animFrameRef = useRef(null);
  const lastDrawnTimeRef = useRef(-1);
  const autoScrollEnabledRef = useRef(true);

  // Dimensions ref (avoid re-renders on resize)
  const dimsRef = useRef({ width: 0, height: 0, dpr: 1 });

  // Track first interaction for contextual hint

  // Cursor state for loop handle hover
  const [cursorStyle, setCursorStyle] = useState('crosshair');

  // Pinch-to-zoom refs
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(null);

  // Theme colors
  const colors = useMemo(() => ({
    waveform: theme === 'dark' ? '#3A414B' : '#B8BEC7',
    waveformPlayed: theme === 'dark' ? '#E8ECF1' : '#0F1216',
    playhead: '#FACC15',
    centerLine: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    loopFill: loopEnabled
      ? 'rgba(250,204,21,0.10)'
      : (theme === 'dark' ? 'rgba(232,236,241,0.06)' : 'rgba(15,18,22,0.05)'),
    loopBorder: loopEnabled
      ? 'rgba(250,204,21,0.7)'
      : (theme === 'dark' ? 'rgba(232,236,241,0.35)' : 'rgba(15,18,22,0.25)'),
    minimapBg: theme === 'dark' ? '#0D0F12' : '#EDEFF3',
    minimapWaveform: theme === 'dark' ? '#242A33' : '#CDD2DA',
    minimapViewport: theme === 'dark' ? 'rgba(250,204,21,0.10)' : 'rgba(202,138,4,0.12)',
    minimapViewportBorder: theme === 'dark' ? 'rgba(250,204,21,0.55)' : 'rgba(202,138,4,0.5)',
    timeText: theme === 'dark' ? '#7C8794' : '#6B7280',
  }), [theme, loopEnabled]);

  // === Viewport helpers ===
  const getVisibleDuration = useCallback(() => duration / zoom, [duration, zoom]);

  // === Signal Deck colouring ===
  // Colour for the column at absolute time tAbs. Quantised to 32 levels and cached so the
  // 60fps overlay doesn't build strings every frame. Returns a neutral when no colour data.
  // The played portion carries the full spectrum colour; unplayed columns are pulled most
  // of the way towards the neutral waveform grey so the track's shape is hinted at without
  // the whole strip lighting up — colour is something you reveal by playing.
  const colorCacheRef = useRef(new Map());
  const columnColor = useCallback((tAbs, alpha, neutral) => {
    const map = waveformColorRef?.current;
    if (!map || !map.colors || !duration) return neutral;
    const idx = Math.min(map.numColumns - 1, Math.max(0, Math.floor((tAbs / duration) * map.numColumns)));
    const v = map.colors[idx];
    if (v < 0) return neutral;
    const q = Math.round(v * 31);
    const played = alpha >= 1;
    const key = `${q}:${played ? 'p' : 'u'}:${neutral}`;
    let c = colorCacheRef.current.get(key);
    if (!c) {
      if (played) {
        c = spectrumColor(q / 31, 1);
      } else {
        const [r, g, b] = spectrumRgb(q / 31);
        const n = parseInt(neutral.slice(1), 16);
        const nr = (n >> 16) & 255, ng = (n >> 8) & 255, nb = n & 255;
        const mix = UNPLAYED_SPECTRUM_MIX;
        c = `rgba(${Math.round(nr + (r - nr) * mix)}, ${Math.round(ng + (g - ng) * mix)}, ${Math.round(nb + (b - nb) * mix)}, ${alpha})`;
      }
      colorCacheRef.current.set(key, c);
    }
    return c;
  }, [waveformColorRef, duration]);

  /**
   * Stroke one 1px vertical segment per pixel column, batching consecutive columns of the
   * same colour into a single path.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} fromPx @param {number} toPx
   * @param {(px:number) => [number, number]|null} segmentAt - returns [yTop, yBot] or null
   * @param {(px:number) => string} colorAt
   */
  const strokeColumns = (ctx, fromPx, toPx, segmentAt, colorAt) => {
    let current = null;
    ctx.lineWidth = 1;
    for (let px = fromPx; px < toPx; px++) {
      const seg = segmentAt(px);
      if (!seg) continue;
      const c = colorAt(px);
      if (c !== current) {
        if (current !== null) ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = c;
        current = c;
      }
      ctx.moveTo(px + 0.5, seg[0]);
      ctx.lineTo(px + 0.5, seg[1]);
    }
    if (current !== null) ctx.stroke();
  };

  const getVisibleStart = useCallback(() => {
    const maxStart = Math.max(0, duration - getVisibleDuration());
    return Math.min(scrollOffset * duration, maxStart);
  }, [scrollOffset, duration, getVisibleDuration]);

  const timeToX = useCallback((time, width) => {
    const visStart = getVisibleStart();
    const visDur = getVisibleDuration();
    return ((time - visStart) / visDur) * width;
  }, [getVisibleStart, getVisibleDuration]);

  const xToTime = useCallback((x, width) => {
    const visStart = getVisibleStart();
    const visDur = getVisibleDuration();
    return visStart + (x / width) * visDur;
  }, [getVisibleStart, getVisibleDuration]);

  // === Canvas sizing ===
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    dimsRef.current = { width, height, dpr };

    [waveformCanvasRef, overlayCanvasRef].forEach(ref => {
      const canvas = ref.current;
      if (!canvas) return;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    });

    // Minimap canvas
    const minimapContainer = minimapContainerRef.current;
    const minimapCanvas = minimapCanvasRef.current;
    if (minimapContainer && minimapCanvas) {
      const mRect = minimapContainer.getBoundingClientRect();
      const mWidth = Math.floor(mRect.width);
      const mHeight = Math.floor(mRect.height);
      minimapCanvas.width = mWidth * dpr;
      minimapCanvas.height = mHeight * dpr;
      minimapCanvas.style.width = mWidth + 'px';
      minimapCanvas.style.height = mHeight + 'px';
    }
  }, []);

  // === Waveform drawing (static layer) ===
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !duration) return;

    const { width, height, dpr } = dimsRef.current;
    if (width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;

    // Draw center line
    ctx.strokeStyle = colors.centerLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    const hiRes = waveformHiResRef?.current;

    const visStart = getVisibleStart();
    const visDur = getVisibleDuration();
    // Unplayed waveform is mostly neutral grey with a hint of spectrum colour; the played
    // portion (full colour, drawn in the overlay) reads as progress
    const dimAlpha = theme === 'dark' ? 0.9 : 0.95;
    const colorAt = (px) => columnColor(visStart + ((px + 0.5) / width) * visDur, dimAlpha, colors.waveform);

    if (hiRes && hiRes.numBlocks > 0) {
      // Hi-res min/max rendering
      strokeColumns(ctx, 0, width, (px) => {
        const t0 = visStart + (px / width) * visDur;
        const t1 = visStart + ((px + 1) / width) * visDur;
        const sampleStart = Math.max(0, Math.floor(t0 * hiRes.sampleRate));
        const sampleEnd = Math.min(hiRes.totalSamples, Math.ceil(t1 * hiRes.sampleRate));
        const blockStart = Math.floor(sampleStart / hiRes.blockSize);
        const blockEnd = Math.min(hiRes.numBlocks - 1, Math.ceil(sampleEnd / hiRes.blockSize));
        if (blockStart > blockEnd || blockStart >= hiRes.numBlocks) return null;
        let minVal = Infinity, maxVal = -Infinity;
        for (let b = blockStart; b <= blockEnd; b++) {
          if (hiRes.mins[b] < minVal) minVal = hiRes.mins[b];
          if (hiRes.maxes[b] > maxVal) maxVal = hiRes.maxes[b];
        }
        if (minVal === Infinity) return null;
        return [Math.min(centerY - maxVal * centerY, centerY - 0.5), Math.max(centerY - minVal * centerY, centerY + 0.5)];
      }, colorAt);
    } else if (waveformData && waveformData.length > 0) {
      // Fallback: 200-point preview (mirrored)
      strokeColumns(ctx, 0, width, (px) => {
        const t0 = visStart + (px / width) * visDur;
        const t1 = visStart + ((px + 1) / width) * visDur;
        const idx0 = Math.floor((t0 / duration) * waveformData.length);
        const idx1 = Math.ceil((t1 / duration) * waveformData.length);
        if (idx0 >= waveformData.length || idx1 < 0) return null;
        let maxVal = 0;
        for (let i = Math.max(0, idx0); i < Math.min(waveformData.length, idx1); i++) {
          if (waveformData[i] > maxVal) maxVal = waveformData[i];
        }
        const halfH = maxVal * centerY;
        return [centerY - halfH, centerY + halfH];
      }, colorAt);
    }
  }, [duration, colors, waveformData, waveformHiResRef, getVisibleStart, getVisibleDuration, columnColor, theme]);

  // === Overlay drawing (animated layer) ===
  const drawOverlay = useCallback((currentTime) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !duration) return;

    const { width, height, dpr } = dimsRef.current;
    if (width === 0 || height === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    const visStart = getVisibleStart();
    const visDur = getVisibleDuration();

    // Draw loop region (use drag preview if actively dragging a handle)
    const drawLoopStart = dragLoopRef.current?.start ?? loopStart;
    const drawLoopEnd = dragLoopRef.current?.end ?? loopEnd;
    if (drawLoopStart != null && drawLoopEnd != null) {
      const lx0 = timeToX(drawLoopStart, width);
      const lx1 = timeToX(drawLoopEnd, width);

      if (lx1 > 0 && lx0 < width) {
        const clampL = Math.max(0, lx0);
        const clampR = Math.min(width, lx1);

        ctx.fillStyle = colors.loopFill;
        ctx.fillRect(clampL, 0, clampR - clampL, height);

        ctx.strokeStyle = colors.loopBorder;
        ctx.lineWidth = 1;
        if (lx0 >= 0 && lx0 <= width) {
          ctx.beginPath();
          ctx.moveTo(lx0 + 0.5, 0);
          ctx.lineTo(lx0 + 0.5, height);
          ctx.stroke();
        }
        if (lx1 >= 0 && lx1 <= width) {
          ctx.beginPath();
          ctx.moveTo(lx1 + 0.5, 0);
          ctx.lineTo(lx1 + 0.5, height);
          ctx.stroke();
        }

        // Draw drag handle indicators (triangles at top/bottom of boundaries)
        const handleColor = colors.loopBorder;
        const hs = 10; // handle size in px
        // Left handle (start boundary)
        if (lx0 >= 0 && lx0 <= width) {
          ctx.fillStyle = handleColor;
          // Top triangle pointing right
          ctx.beginPath();
          ctx.moveTo(lx0, 0);
          ctx.lineTo(lx0 + hs, 0);
          ctx.lineTo(lx0, hs);
          ctx.closePath();
          ctx.fill();
          // Bottom triangle pointing right
          ctx.beginPath();
          ctx.moveTo(lx0, height);
          ctx.lineTo(lx0 + hs, height);
          ctx.lineTo(lx0, height - hs);
          ctx.closePath();
          ctx.fill();
        }
        // Right handle (end boundary)
        if (lx1 >= 0 && lx1 <= width) {
          ctx.fillStyle = handleColor;
          // Top triangle pointing left
          ctx.beginPath();
          ctx.moveTo(lx1, 0);
          ctx.lineTo(lx1 - hs, 0);
          ctx.lineTo(lx1, hs);
          ctx.closePath();
          ctx.fill();
          // Bottom triangle pointing left
          ctx.beginPath();
          ctx.moveTo(lx1, height);
          ctx.lineTo(lx1 - hs, height);
          ctx.lineTo(lx1, height - hs);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Draw played portion of waveform in orange
    if (currentTime > 0 && duration > 0) {
      const playX = timeToX(currentTime, width);

      if (playX > 0) {
        const hiRes = waveformHiResRef?.current;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, Math.min(playX, width), height);
        ctx.clip();

        const endPx = Math.min(Math.ceil(playX), width);
        const playedColorAt = (px) => columnColor(visStart + ((px + 0.5) / width) * visDur, 1, colors.waveformPlayed);

        if (hiRes && hiRes.numBlocks > 0) {
          strokeColumns(ctx, 0, endPx, (px) => {
            const t0 = visStart + (px / width) * visDur;
            const t1 = visStart + ((px + 1) / width) * visDur;
            const sampleStart = Math.max(0, Math.floor(t0 * hiRes.sampleRate));
            const sampleEnd = Math.min(hiRes.totalSamples, Math.ceil(t1 * hiRes.sampleRate));
            const blockStart = Math.floor(sampleStart / hiRes.blockSize);
            const blockEnd = Math.min(hiRes.numBlocks - 1, Math.ceil(sampleEnd / hiRes.blockSize));
            if (blockStart > blockEnd || blockStart >= hiRes.numBlocks) return null;
            let minVal = Infinity, maxVal = -Infinity;
            for (let b = blockStart; b <= blockEnd; b++) {
              if (hiRes.mins[b] < minVal) minVal = hiRes.mins[b];
              if (hiRes.maxes[b] > maxVal) maxVal = hiRes.maxes[b];
            }
            if (minVal === Infinity) return null;
            return [Math.min(centerY - maxVal * centerY, centerY - 0.5), Math.max(centerY - minVal * centerY, centerY + 0.5)];
          }, playedColorAt);
        } else if (waveformData && waveformData.length > 0) {
          strokeColumns(ctx, 0, endPx, (px) => {
            const t0 = visStart + (px / width) * visDur;
            const t1 = visStart + ((px + 1) / width) * visDur;
            const idx0 = Math.floor((t0 / duration) * waveformData.length);
            const idx1 = Math.ceil((t1 / duration) * waveformData.length);
            if (idx0 >= waveformData.length || idx1 < 0) return null;
            let maxVal = 0;
            for (let i = Math.max(0, idx0); i < Math.min(waveformData.length, idx1); i++) {
              if (waveformData[i] > maxVal) maxVal = waveformData[i];
            }
            const halfH = maxVal * centerY;
            return [centerY - halfH, centerY + halfH];
          }, playedColorAt);
        }

        ctx.restore();
      }
    }

    // Draw playhead
    if (currentTime >= 0 && duration > 0) {
      const px = timeToX(currentTime, width);
      if (px >= 0 && px <= width) {
        ctx.strokeStyle = colors.playhead;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();

        // Small triangle markers at top and bottom
        ctx.fillStyle = colors.playhead;
        ctx.beginPath();
        ctx.moveTo(px - 4, 0);
        ctx.lineTo(px + 4, 0);
        ctx.lineTo(px, 6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(px - 4, height);
        ctx.lineTo(px + 4, height);
        ctx.lineTo(px, height - 6);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [duration, colors, waveformData, waveformHiResRef, loopStart, loopEnd, getVisibleStart, getVisibleDuration, timeToX, columnColor]);

  // === Minimap drawing ===
  const drawMinimap = useCallback(() => {
    const canvas = minimapCanvasRef.current;
    const container = minimapContainerRef.current;
    if (!canvas || !container || !waveformData || waveformData.length === 0 || !duration) return;

    const dpr = dimsRef.current.dpr;
    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = colors.minimapBg;
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;

    // Draw full waveform (using 200-point preview)
    ctx.strokeStyle = colors.minimapWaveform;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let px = 0; px < width; px++) {
      const idx = Math.floor((px / width) * waveformData.length);
      const val = waveformData[Math.min(idx, waveformData.length - 1)] || 0;
      const halfH = val * centerY * 0.9;
      ctx.moveTo(px + 0.5, centerY - halfH);
      ctx.lineTo(px + 0.5, centerY + halfH);
    }
    ctx.stroke();

    // Draw loop region on minimap
    if (loopStart != null && loopEnd != null && duration > 0) {
      const lx0 = (loopStart / duration) * width;
      const lx1 = (loopEnd / duration) * width;
      ctx.fillStyle = colors.loopFill;
      ctx.fillRect(lx0, 0, lx1 - lx0, height);
    }

    // Draw viewport rectangle
    const vpStart = getVisibleStart() / duration;
    const vpWidth = getVisibleDuration() / duration;
    const vpX = vpStart * width;
    const vpW = Math.max(4, vpWidth * width);

    ctx.fillStyle = colors.minimapViewport;
    ctx.fillRect(vpX, 0, vpW, height);
    ctx.strokeStyle = colors.minimapViewportBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX + 0.5, 0.5, vpW - 1, height - 1);

    // Draw playhead on minimap
    const currentTime = playbackTimeRef?.current ?? playbackTime ?? 0;
    if (currentTime > 0 && duration > 0) {
      const phX = (currentTime / duration) * width;
      ctx.strokeStyle = colors.playhead;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(phX + 0.5, 0);
      ctx.lineTo(phX + 0.5, height);
      ctx.stroke();
    }
  }, [waveformData, duration, colors, loopStart, loopEnd, playbackTime, playbackTimeRef, getVisibleStart, getVisibleDuration]);

  // === Animation loop for playhead ===
  useEffect(() => {
    let running = true;

    const animate = () => {
      if (!running) return;

      const currentTime = playbackTimeRef?.current ?? playbackTime ?? 0;

      if (currentTime !== lastDrawnTimeRef.current) {
        lastDrawnTimeRef.current = currentTime;
        drawOverlay(currentTime);

        // Auto-scroll: if playhead reaches 80% of viewport, scroll to put it at 30%
        if (autoScrollEnabledRef.current && zoom > 1 && duration > 0) {
          const { width } = dimsRef.current;
          if (width > 0) {
            const playX = timeToX(currentTime, width);
            if (playX > width * 0.8) {
              const newStart = currentTime - getVisibleDuration() * 0.3;
              setScrollOffset(Math.max(0, Math.min(newStart / duration, 1 - 1 / zoom)));
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playbackTime, playbackTimeRef, drawOverlay, zoom, duration, timeToX, getVisibleDuration]);

  // === Resize observer ===
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      resizeCanvases();
      drawWaveform();
      drawOverlay(playbackTimeRef?.current ?? playbackTime ?? 0);
      drawMinimap();
    });

    observer.observe(container);
    if (minimapContainerRef.current) {
      observer.observe(minimapContainerRef.current);
    }

    // Initial sizing
    resizeCanvases();

    return () => observer.disconnect();
  }, [resizeCanvases, drawWaveform, drawOverlay, drawMinimap, playbackTime, playbackTimeRef]);

  // === Redraw waveform when zoom/scroll/data/theme changes ===
  useEffect(() => {
    drawWaveform();
    drawOverlay(playbackTimeRef?.current ?? playbackTime ?? 0);
    drawMinimap();
  }, [zoom, scrollOffset, drawWaveform, drawOverlay, drawMinimap, playbackTime, playbackTimeRef]);

  // Poll for hi-res data arrival (ref-based, no state trigger)
  useEffect(() => {
    if (!waveformHiResRef) return;

    let gotHiRes = false, gotColors = false, ticks = 0;
    const checkInterval = setInterval(() => {
      ticks++;
      const hiResNow = !!waveformHiResRef.current;
      const colorsNow = !!waveformColorRef?.current;
      if ((hiResNow && !gotHiRes) || (colorsNow && !gotColors)) {
        gotHiRes = hiResNow; gotColors = colorsNow;
        drawWaveform();
        drawOverlay(playbackTimeRef?.current ?? playbackTime ?? 0);
      }
      // Stop once both arrived, or give up after 30s (colour data is optional)
      if ((gotHiRes && (gotColors || !waveformColorRef)) || ticks > 300) clearInterval(checkInterval);
    }, 100);

    return () => clearInterval(checkInterval);
  }, [waveformHiResRef, waveformColorRef, drawWaveform, drawOverlay, playbackTime, playbackTimeRef]);

  // === Zoom helpers ===
  const handleZoomIn = useCallback(() => {
    setZoom(prev => {
      const nextSnap = ZOOM_SNAPS.find(s => s > prev + 0.01);
      return nextSnap || ZOOM_SNAPS[ZOOM_SNAPS.length - 1];
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const prevSnap = [...ZOOM_SNAPS].reverse().find(s => s < prev - 0.01);
      return prevSnap || 1;
    });
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setScrollOffset(0);
  }, []);

  // Zoom centered on a specific position (for scroll wheel / pinch)
  const zoomCenteredAt = useCallback((newZoom, centerFraction) => {
    const clampedZoom = Math.max(1, Math.min(64, newZoom));
    const visStartBefore = scrollOffset * duration;
    const visDurBefore = duration / zoom;
    const centerTime = visStartBefore + centerFraction * visDurBefore;

    const visDurAfter = duration / clampedZoom;
    const newVisStart = centerTime - centerFraction * visDurAfter;
    const newOffset = duration > 0 ? Math.max(0, Math.min(newVisStart / duration, 1 - 1 / clampedZoom)) : 0;

    setZoom(clampedZoom);
    setScrollOffset(newOffset);
  }, [zoom, scrollOffset, duration]);

  // === Mouse/Touch interaction ===
  const getEventPos = useCallback((e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (!containerRef.current || !duration) return;

    // Pinch detection (two touches)
    if (e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartZoomRef.current = zoom;
      setDragMode('pinch');
      e.preventDefault();
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const pos = getEventPos(e);
    const localX = pos.x - rect.left;
    const time = xToTime(localX, rect.width);

    dragStartRef.current = { x: pos.x, localX, time, scrollOffset };
    dragLoopRef.current = null;
    autoScrollEnabledRef.current = false;

    // Shift+drag = pan
    if (e.shiftKey) {
      setDragMode('pan');
    } else if (loopStart != null && loopEnd != null) {
      // Check if clicking near a loop handle (within 8px of boundary)
      const startX = timeToX(loopStart, rect.width);
      const endX = timeToX(loopEnd, rect.width);
      const HANDLE_THRESHOLD = 12;

      if (Math.abs(localX - startX) < HANDLE_THRESHOLD) {
        setDragMode('handle-start');
        dragLoopRef.current = { start: loopStart, end: loopEnd };
      } else if (Math.abs(localX - endX) < HANDLE_THRESHOLD) {
        setDragMode('handle-end');
        dragLoopRef.current = { start: loopStart, end: loopEnd };
      } else {
        setDragMode('pending');
      }
    } else {
      setDragMode('pending'); // Decide on move whether it's seek or loop-select
    }

    e.preventDefault();
  }, [duration, zoom, getEventPos, xToTime, scrollOffset, loopStart, loopEnd, timeToX]);

  const handlePointerMove = useCallback((e) => {
    if (!dragStartRef.current || !containerRef.current || !duration) return;

    // Pinch zoom
    if (dragMode === 'pinch' && e.touches && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / pinchStartDistRef.current;
      const newZoom = pinchStartZoomRef.current * ratio;

      const rect = containerRef.current.getBoundingClientRect();
      const midX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
      const centerFrac = midX / rect.width;
      zoomCenteredAt(newZoom, centerFrac);
      e.preventDefault();
      return;
    }

    const pos = getEventPos(e);
    const dx = pos.x - dragStartRef.current.x;

    if (dragMode === 'pan') {
      // Pan: move view based on drag distance
      const rect = containerRef.current.getBoundingClientRect();
      const visDur = getVisibleDuration();
      const timeDelta = (dx / rect.width) * visDur;
      const newStart = (dragStartRef.current.scrollOffset * duration) - timeDelta;
      const maxStart = Math.max(0, duration - visDur);
      setScrollOffset(duration > 0 ? Math.max(0, Math.min(newStart / duration, maxStart / duration)) : 0);
      return;
    }

    // Decide between seek and loop-select
    if (dragMode === 'pending' && Math.abs(dx) > 5) {
      setDragMode('loop-select');
    }

    if (dragMode === 'loop-select') {
      const rect = containerRef.current.getBoundingClientRect();
      const localX = Math.max(0, Math.min(pos.x - rect.left, rect.width));
      const currentTime = xToTime(localX, rect.width);
      const startTime = dragStartRef.current.time;

      const loopS = Math.max(0, Math.min(startTime, currentTime));
      const loopE = Math.min(duration, Math.max(startTime, currentTime));

      if (loopE - loopS > 0.05) {
        dragLoopRef.current = { start: loopS, end: loopE };
        // Draw preview
        drawOverlay(playbackTimeRef?.current ?? playbackTime ?? 0);
      }
    }

    // Handle drag: resize loop boundary
    if (dragMode === 'handle-start' || dragMode === 'handle-end') {
      const rect = containerRef.current.getBoundingClientRect();
      const localX = Math.max(0, Math.min(pos.x - rect.left, rect.width));
      const currentTime = Math.max(0, Math.min(xToTime(localX, rect.width), duration));

      if (dragMode === 'handle-start') {
        const newStart = Math.min(currentTime, (dragLoopRef.current?.end ?? duration) - 0.1);
        dragLoopRef.current = { start: Math.max(0, newStart), end: dragLoopRef.current?.end ?? duration };
      } else {
        const newEnd = Math.max(currentTime, (dragLoopRef.current?.start ?? 0) + 0.1);
        dragLoopRef.current = { start: dragLoopRef.current?.start ?? 0, end: Math.min(newEnd, duration) };
      }
      drawOverlay(playbackTimeRef?.current ?? playbackTime ?? 0);
    }
  }, [dragMode, duration, getEventPos, getVisibleDuration, xToTime, zoomCenteredAt, drawOverlay, playbackTime, playbackTimeRef]);

  const handlePointerUp = useCallback(() => {
    if (!dragStartRef.current) return;

    if ((dragMode === 'loop-select' || dragMode === 'handle-start' || dragMode === 'handle-end') && dragLoopRef.current) {
      // Complete loop selection or handle resize
      const { start, end } = dragLoopRef.current;
      if (end - start >= 0.1) {
        onLoopRegionChange?.({ start, end });
      }
    } else if (dragMode === 'pending') {
      // No significant drag — this is a click/seek
      onSeek?.(Math.max(0, Math.min(dragStartRef.current.time, duration)));
    }

    dragStartRef.current = null;
    dragLoopRef.current = null;
    setDragMode(null);
    autoScrollEnabledRef.current = true;
  }, [dragMode, duration, onSeek, onLoopRegionChange]);

  // === Hover cursor for loop handles ===
  const handleHoverCursor = useCallback((e) => {
    if (dragMode || !containerRef.current || loopStart == null || loopEnd == null) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const startX = timeToX(loopStart, rect.width);
    const endX = timeToX(loopEnd, rect.width);
    const HANDLE_THRESHOLD = 12;

    if (Math.abs(localX - startX) < HANDLE_THRESHOLD || Math.abs(localX - endX) < HANDLE_THRESHOLD) {
      setCursorStyle('ew-resize');
    } else {
      setCursorStyle('crosshair');
    }
  }, [dragMode, loopStart, loopEnd, timeToX]);

  // === Scroll wheel: pan (default) or zoom (Ctrl/Cmd) ===
  const handleWheel = useCallback((e) => {
    if (!containerRef.current || !duration) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const centerFrac = localX / rect.width;

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered on cursor
      const zoomFactor = 1 - e.deltaY * 0.003;
      zoomCenteredAt(zoom * zoomFactor, centerFrac);
    } else {
      // Horizontal pan
      const visDur = getVisibleDuration();
      const panAmount = (e.deltaY + e.deltaX) * 0.001 * visDur;
      const newStart = getVisibleStart() + panAmount;
      const maxStart = Math.max(0, duration - visDur);
      setScrollOffset(duration > 0 ? Math.max(0, Math.min(newStart / duration, maxStart / duration)) : 0);
    }
  }, [duration, zoom, zoomCenteredAt, getVisibleDuration, getVisibleStart]);

  // Attach wheel listener with { passive: false }
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // === Minimap interaction (click to jump + drag to pan) ===
  const minimapPanTo = useCallback((clientX) => {
    if (!minimapContainerRef.current || !duration) return;
    const rect = minimapContainerRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
    const visDur = getVisibleDuration();
    const newStart = frac * duration - visDur / 2;
    const maxStart = Math.max(0, duration - visDur);
    setScrollOffset(duration > 0 ? Math.max(0, Math.min(newStart / duration, maxStart / duration)) : 0);
  }, [duration, getVisibleDuration]);

  const handleMinimapDown = useCallback((e) => {
    if (!minimapContainerRef.current || !duration) return;
    e.preventDefault();
    minimapDragRef.current = true;
    autoScrollEnabledRef.current = false;
    minimapPanTo(e.clientX);

    const handleMove = (moveEvent) => {
      if (!minimapDragRef.current) return;
      minimapPanTo(moveEvent.clientX);
    };
    const handleUp = () => {
      minimapDragRef.current = null;
      autoScrollEnabledRef.current = true;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [duration, minimapPanTo]);

  const handleMinimapTouchStart = useCallback((e) => {
    if (!minimapContainerRef.current || !duration) return;
    e.preventDefault();
    minimapDragRef.current = true;
    autoScrollEnabledRef.current = false;
    if (e.touches.length > 0) {
      minimapPanTo(e.touches[0].clientX);
    }
  }, [duration, minimapPanTo]);

  const handleMinimapTouchMove = useCallback((e) => {
    if (!minimapDragRef.current) return;
    if (e.touches.length > 0) {
      minimapPanTo(e.touches[0].clientX);
    }
  }, [minimapPanTo]);

  const handleMinimapTouchEnd = useCallback(() => {
    minimapDragRef.current = null;
    autoScrollEnabledRef.current = true;
  }, []);

  // === Time markers ===
  const timeMarkers = useMemo(() => {
    if (!duration) return [];
    const visStart = getVisibleStart();
    const visDur = getVisibleDuration();
    const visEnd = visStart + visDur;

    // Determine good interval based on visible duration
    const targetMarkers = 6;
    const rawInterval = visDur / targetMarkers;

    // Snap to nice intervals
    const niceIntervals = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const interval = niceIntervals.find(i => i >= rawInterval) || rawInterval;

    const markers = [];
    const firstMark = Math.ceil(visStart / interval) * interval;
    for (let t = firstMark; t <= visEnd; t += interval) {
      const frac = (t - visStart) / visDur;
      if (frac >= 0 && frac <= 1) {
        markers.push({ time: t, position: frac * 100 });
      }
    }
    return markers;
  }, [duration, getVisibleStart, getVisibleDuration]);

  // Format time with appropriate precision based on zoom
  const formatTimeForZoom = useCallback((seconds) => {
    if (zoom >= 16) {
      // Show milliseconds
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }
    return formatTime(seconds);
  }, [zoom, formatTime]);

  if (!waveformData || waveformData.length === 0) return null;

  return (
    <div className={`p-4 mb-4 ${t.card}`}>
      {/* Header: Zoom controls + loop info */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-sm font-medium ${t.textMuted} flex items-center gap-2`}>
          Waveform
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className={`p-1.5 min-w-[32px] min-h-[32px] transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-stone-200'} disabled:opacity-30 flex items-center justify-center`}
              title="Zoom out"
              aria-label="Zoom out waveform"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className={`text-xs ${t.textDimmed} w-10 text-center`}>
              {zoom >= 10 ? `${Math.round(zoom)}x` : `${zoom.toFixed(1)}x`}
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 64}
              className={`p-1.5 min-w-[32px] min-h-[32px] transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-stone-200'} disabled:opacity-30 flex items-center justify-center`}
              title="Zoom in"
              aria-label="Zoom in waveform"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoom > 1 && (
              <button
                onClick={handleZoomReset}
                className={`p-1.5 min-w-[32px] min-h-[32px] transition-colors ${theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-stone-200'} flex items-center justify-center`}
                title="Reset zoom"
                aria-label="Reset zoom to 1x"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loopStart !== null && loopEnd !== null && (
            <>
              <span className={`text-xs ${t.textDimmed}`}>
                Loop: {formatTime(loopStart)} - {formatTime(loopEnd)}
              </span>
              <button
                onClick={onToggleLoop}
                className={`p-2 min-w-[36px] min-h-[36px] transition-colors flex items-center justify-center gap-1 ${loopEnabled ? (theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white') : t.button}`}
                title="Toggle loop (L)"
                aria-label={loopEnabled ? 'Disable loop' : 'Enable loop'}
                aria-pressed={loopEnabled}
              >
                <Repeat className="w-4 h-4" />
                <kbd className={`hidden sm:inline text-[10px] px-1 rounded font-mono ${loopEnabled ? (theme === 'dark' ? 'bg-black/20 text-black/60' : 'bg-white/20 text-white/60') : (theme === 'dark' ? 'bg-zinc-700 text-zinc-500' : 'bg-stone-200 text-stone-500')}`}>L</kbd>
              </button>
              <button
                onClick={onClearLoop}
                className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center gap-1 transition-colors ${t.button}`}
                title="Clear loop (Esc)"
                aria-label="Clear loop region"
              >
                <X className="w-4 h-4" />
                <kbd className={`hidden sm:inline text-[10px] px-1 rounded font-mono ${theme === 'dark' ? 'bg-zinc-700 text-zinc-500' : 'bg-stone-200 text-stone-500'}`}>Esc</kbd>
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`font-mono text-[11px] ${t.textDimmed} mb-2`}>
        click to seek · drag to loop{loopStart != null ? ' · drag edges to resize' : ''} · scroll to pan · ctrl+scroll to zoom{zoom > 1 && ' · shift+drag to pan'}
      </div>

      {/* Main waveform canvas area */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: '120px', touchAction: 'none', cursor: cursorStyle }}
        onMouseDown={handlePointerDown}
        onMouseMove={(e) => { handlePointerMove(e); handleHoverCursor(e); }}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas ref={waveformCanvasRef} className="absolute inset-0" style={{ pointerEvents: 'none' }} />
        <canvas ref={overlayCanvasRef} className="absolute inset-0" style={{ pointerEvents: 'none' }} />
      </div>

      {/* Minimap / scrollbar — click to jump, drag to smoothly pan */}
      <div
        ref={minimapContainerRef}
        className="relative mt-1 cursor-grab active:cursor-grabbing select-none"
        style={{ height: '32px', minHeight: '44px', touchAction: 'none' }}
        onMouseDown={handleMinimapDown}
        onTouchStart={handleMinimapTouchStart}
        onTouchMove={handleMinimapTouchMove}
        onTouchEnd={handleMinimapTouchEnd}
      >
        <canvas ref={minimapCanvasRef} className="absolute inset-0" style={{ pointerEvents: 'none' }} />
      </div>

      {/* Time markers */}
      <div className="relative mt-1" style={{ height: '16px' }}>
        {timeMarkers.map((marker, i) => (
          <span
            key={i}
            className="absolute text-[10px] -translate-x-1/2"
            style={{ left: `${marker.position}%`, color: colors.timeText }}
          >
            {formatTimeForZoom(marker.time)}
          </span>
        ))}
      </div>
    </div>
  );
}
