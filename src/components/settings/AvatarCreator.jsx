import { useState, useRef } from 'react';
import { Loader2, Check, Camera, ChevronDown, ChevronUp, Headphones, Music, AudioWaveform, Mic, Disc3, Speaker, Piano, Radio, Zap, Guitar, Drum } from 'lucide-react';
import { AVATAR_PRESETS } from '../../data/avatars';

// Map icon name strings from avatars.js to actual components
const ICON_MAP = { Headphones, Music, AudioWaveform, Mic, Disc3, Speaker, Piano, Radio, Zap, Guitar, Drum };
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

/**
 * Avatar Creator — grid of pre-made music-themed avatar presets.
 * Selecting one renders it to canvas and uploads to Supabase Storage
 * as a JPEG, reusing the same avatar path as the photo upload in Profile.
 */
export function AvatarCreator({ theme, t }) {
  const { user, updateProfile } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const previewRef = useRef(null);

  // Also support photo upload as alternative
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);

  const handleSaveAvatar = async () => {
    if (!selectedId || !user) return;

    const preset = AVATAR_PRESETS.find(p => p.id === selectedId);
    if (!preset) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Read the icon SVG from the hidden preview element
      const svgElement = previewRef.current?.querySelector('svg');
      if (!svgElement) throw new Error('Could not find icon SVG');

      const svgContent = svgElement.outerHTML;

      // Build a full SVG with background + centered icon
      const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
        <rect width="400" height="400" fill="${preset.bgColor}"/>
        <g transform="translate(100, 100) scale(8.33)">
          ${svgContent.replace(/<svg[^>]*>/, '').replace('</svg>', '').replace(/class="[^"]*"/g, '').replace(/stroke="currentColor"/g, `stroke="${preset.iconColor}"`).replace(/fill="none"/g, 'fill="none"')}
        </g>
      </svg>`;

      // Convert SVG to canvas to JPEG blob
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      const svgBlob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 400, 400);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Failed to render avatar'));
        };
        img.src = svgUrl;
      });

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Canvas export failed')),
          'image/jpeg',
          0.85
        );
      });

      // Upload to Supabase Storage (same path as photo upload)
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get public URL and save to profile
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Avatar save failed:', err);
      setError('Failed to save avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Photo upload (alternative to preset selection)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    setError(null);

    try {
      // Resize to 400x400 using Canvas
      const blob = await resizeImage(file, 400);
      const filePath = `${user.id}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
      setSelectedId(null); // Clear preset selection since they uploaded a photo
    } catch (err) {
      console.error('Photo upload failed:', err);
      setError('Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${t.text}`}>
        <Camera className="w-5 h-5" />
        Avatar
      </h3>

      <div className={`p-6 border rounded-lg ${
        theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-stone-200'
      }`}>
        {/* Collapsible Preset Picker */}
        <button
          onClick={() => setPresetsExpanded(!presetsExpanded)}
          className={`w-full flex items-center justify-between px-3 py-2.5 mb-3 text-sm font-medium transition-colors rounded-md ${
            theme === 'dark'
              ? 'text-zinc-300 hover:bg-zinc-800 border border-zinc-700'
              : 'text-stone-500 hover:bg-amber-50 border border-stone-200'
          }`}
        >
          <span>Choose a preset avatar</span>
          {presetsExpanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </button>

        {presetsExpanded && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
            {AVATAR_PRESETS.map((preset) => {
              const IconComponent = ICON_MAP[preset.icon];
              const isSelected = selectedId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedId(preset.id)}
                  className={`relative aspect-square flex items-center justify-center transition-all rounded-full ${
                    isSelected
                      ? 'ring-2 ring-offset-2 ' + (theme === 'dark' ? 'ring-white ring-offset-zinc-900' : 'ring-ember-600 ring-offset-white')
                      : 'hover:opacity-80'
                  }`}
                  style={{ backgroundColor: preset.bgColor }}
                  title={preset.label}
                >
                  {IconComponent && (
                    <IconComponent
                      className="w-6 h-6 sm:w-8 sm:h-8"
                      style={{ color: preset.iconColor }}
                      strokeWidth={1.5}
                    />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Hidden preview element for SVG extraction */}
        {selectedId && (
          <div ref={previewRef} className="hidden" aria-hidden="true">
            {(() => {
              const preset = AVATAR_PRESETS.find(p => p.id === selectedId);
              const IconComponent = preset ? ICON_MAP[preset.icon] : null;
              return IconComponent ? (
                <IconComponent
                  width={24}
                  height={24}
                  style={{ color: preset.iconColor }}
                  strokeWidth={1.5}
                />
              ) : null;
            })()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Save Preset Button */}
          <button
            onClick={handleSaveAvatar}
            disabled={!selectedId || saving}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-md ${
              saved
                ? theme === 'dark'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-green-50 text-green-700 border border-green-200'
                : !selectedId
                  ? theme === 'dark'
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved' : 'Save Avatar'}
          </button>

          {/* Or Upload Photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-md ${
              theme === 'dark'
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700'
                : 'text-stone-500 hover:text-ember-600 hover:bg-amber-50 border border-stone-200'
            }`}
          >
            {uploadingPhoto ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            Upload Photo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}

// Resize image to square using Canvas (same as Profile.jsx)
function resizeImage(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Resize failed')), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
