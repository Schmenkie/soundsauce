import { Upload, Music } from 'lucide-react';

const ACCEPT = '.wav,.mp3,.m4a,.flac,audio/wav,audio/x-wav,audio/wave,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/flac';

/**
 * Local file drop zone.
 *
 * `showWelcome` (nothing loaded yet): a proper drop panel under the paste-a-link hero.
 * Otherwise: one quiet line — the loaded track owns the page, this is just the way out.
 * The whole page is the drop target either way (drag handlers come from Analyze).
 */
export function AudioUploadSection({
  isDragging,
  onFileUpload,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  showWelcome,
  dropZoneRef,
  theme,
  t
}) {
  const isDark = theme === 'dark';
  const input = <input type="file" accept={ACCEPT} onChange={onFileUpload} className="hidden" />;

  if (!showWelcome) {
    return (
      <div
        ref={dropZoneRef}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`flex items-center justify-between gap-3 px-4 py-2 mb-4 rounded-md border border-dashed font-mono text-[11px] transition-colors ${
          isDragging
            ? 'border-ember-500 text-ember-500'
            : isDark ? 'border-[#1C2027] text-[#7C8794]' : 'border-[#D9DDE3] text-[#6B7280]'
        }`}
      >
        <span>{isDragging ? 'drop to load it' : 'drop another file anywhere on the page'}</span>
        <label className={`cursor-pointer underline-offset-2 hover:underline ${isDark ? 'text-[#9AA4B0]' : 'text-[#4B5563]'}`}>
          choose a file…
          {input}
        </label>
      </div>
    );
  }

  return (
    <div
      ref={dropZoneRef}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`mb-6 rounded-lg border border-dashed p-8 text-center transition-colors ${
        isDragging
          ? 'border-ember-500 bg-ember-500/5'
          : isDark ? 'border-[#2A3039] bg-[#0D0F12]/60' : 'border-[#B8BEC7] bg-[#F5F6F8]'
      }`}
    >
      <div className={`w-12 h-12 mx-auto mb-4 rounded-md flex items-center justify-center border ${isDark ? 'bg-[#14171C] border-[#1C2027]' : 'bg-white border-[#D9DDE3]'}`}>
        <Music className={`w-5 h-5 ${isDragging ? 'text-ember-500' : t.textMuted}`} />
      </div>
      <h3 className={`font-display font-bold uppercase tracking-wide text-sm ${t.text}`}>
        {isDragging ? 'Drop it' : 'Or drop a file'}
      </h3>
      <p className={`font-mono text-[12px] mt-1 mb-5 ${t.textMuted}`}>WAV, MP3, M4A or FLAC from your Mac</p>
      <label className="inline-block cursor-pointer">
        <span className={`inline-flex items-center gap-2 px-5 h-10 rounded-md text-sm font-semibold ${
          isDark ? 'bg-ember-500 text-[#1A1400] hover:bg-ember-400' : 'bg-ember-600 text-white hover:bg-ember-700'
        }`}>
          <Upload className="w-4 h-4" /> Upload Audio
        </span>
        {input}
      </label>
    </div>
  );
}
