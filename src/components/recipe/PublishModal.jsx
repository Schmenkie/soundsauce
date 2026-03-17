import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { X, Send, Tag, Download, Loader } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
// Lazy-loaded — only fetched during publish flow
const getPresetGenerator = () => import('../../services/vitalPresetGenerator');
import { CURATED_PRESETS, INSTRUMENT_TO_CATEGORY } from '../../data/vitalPresets';
import { supabase } from '../../lib/supabase';

const PREDEFINED_TAGS = ['Bass', 'Lead', 'Pad', 'Pluck', 'Kick', 'Drums', 'Strings', 'Vocal', 'FX', 'Brass', 'Woodwind', 'Guitar'];

/**
 * Get the best default preset ID based on the detected instrument.
 */
function getDefaultPresetForInstrument(instrument) {
  const category = INSTRUMENT_TO_CATEGORY[instrument?.toLowerCase()] || 'lead';
  const presetsInCategory = CURATED_PRESETS.filter(p => p.category === category);
  return presetsInCategory[0]?.id || 'saw_bass';
}

/**
 * Modal for publishing an analysis as a Sound Sauce.
 * Lets the user edit the title, add a description, and select tags.
 */
export function PublishModal({ item, onPublish, onClose, theme, selectedPresetId, tuningOverrides }) {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [includePreset, setIncludePreset] = useState(true);
  const [presetStatus, setPresetStatus] = useState('');

  const focusTrapRef = useFocusTrap(true);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Use the selected preset from PresetSelector, or auto-pick based on instrument
  const presetId = selectedPresetId || getDefaultPresetForInstrument(item?.instrument);
  const hasPreset = !!presetId;

  const t = theme === 'dark' ? {
    overlay: 'bg-black/70',
    modal: 'bg-zinc-900 border-zinc-700',
    text: 'text-white',
    textMuted: 'text-zinc-400',
    input: 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 rounded-md focus:ring-2 focus:ring-ember-500/30 focus:border-ember-500',
    tag: 'bg-zinc-800 text-white hover:bg-zinc-700 rounded-full',
    tagActive: 'bg-white text-black rounded-full',
    buttonPrimary: 'bg-white text-black hover:bg-zinc-200 rounded-md',
    buttonSecondary: 'bg-zinc-800 text-white hover:bg-zinc-700 rounded-md',
  } : {
    overlay: 'bg-black/40',
    modal: 'bg-white border-stone-200',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    input: 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 rounded-md focus:ring-2 focus:ring-ember-600/20 focus:border-ember-600',
    tag: 'bg-amber-50 text-ember-700 border border-stone-200 hover:bg-amber-100 rounded-full',
    tagActive: 'bg-ember-600 text-white rounded-full',
    buttonPrimary: 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20 rounded-md',
    buttonSecondary: 'bg-stone-900 text-white hover:bg-stone-800 rounded-md',
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
      setCustomTag('');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setPublishing(true);

    let vitalPresetUrl = null;

    // Generate and upload Vital preset if user opted in
    if (includePreset && hasPreset) {
      try {
        setPresetStatus('Generating preset...');

        const { buildVitalPreset, presetToVitalFile, buildPresetFilename } = await getPresetGenerator();
        const preset = buildVitalPreset(presetId, tuningOverrides || {}, {
          presetName: title.trim(),
          author: 'SoundSauce',
        });

        setPresetStatus('Uploading preset...');
        const presetData = presetToVitalFile(preset);
        const safeName = buildPresetFilename({ presetName: title.trim() }).replace(/[^a-zA-Z0-9_\- ()]/g, '_');

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/upload-preset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ presetData, filename: safeName }),
        });

        if (res.ok) {
          const { url } = await res.json();
          vitalPresetUrl = url;
        } else {
          console.error('Preset upload failed, publishing without preset');
        }
      } catch (err) {
        console.error('Preset generation/upload error:', err);
        // Continue publishing without preset — don't block the publish
      }
      setPresetStatus('');
    }

    const success = await onPublish(item.id, {
      title: title.trim(),
      description: description.trim(),
      tags: selectedTags,
      vitalPresetUrl,
    });
    setPublishing(false);
    if (success) onClose();
  };

  // Find preset name for display
  const presetName = CURATED_PRESETS.find(p => p.id === presetId)?.name || 'Default';

  return (
    <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.overlay} backdrop-blur-sm`}
      onClick={onClose}
    >
      <motion.div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
        className={`w-full max-w-lg border rounded-lg ${t.modal} shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <h2 id="publish-modal-title" className={`text-lg font-bold ${t.text}`}>Publish Sound Sauce</h2>
          <button onClick={onClose} className={`p-1.5 rounded-md transition-colors ${t.textMuted} ${theme === 'dark' ? 'hover:bg-zinc-800 hover:text-white' : 'hover:bg-stone-100 hover:text-stone-900'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="publish-title" className={`block text-sm font-medium mb-1 ${t.textMuted}`}>Title</label>
            <input
              id="publish-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border ${t.input} focus:outline-none`}
              placeholder="Give your recipe a name..."
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="publish-description" className={`block text-sm font-medium mb-1 ${t.textMuted}`}>Description</label>
            <textarea
              id="publish-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full px-3 py-2 border ${t.input} focus:outline-none resize-none`}
              rows={3}
              placeholder="Describe the sound and how to recreate it..."
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="publish-custom-tag" className={`block text-sm font-medium mb-2 ${t.textMuted}`}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PREDEFINED_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-sm font-medium transition-all ${
                    selectedTags.includes(tag) ? t.tagActive : t.tag
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {/* Custom tag input */}
            <div className="flex gap-2">
              <input
                id="publish-custom-tag"
                type="text"
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                className={`flex-1 px-3 py-1.5 border text-sm ${t.input} focus:outline-none`}
                placeholder="Add custom tag..."
              />
              <button
                onClick={addCustomTag}
                className={`px-3 py-1.5 text-sm ${t.buttonSecondary}`}
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>
            {/* Selected custom tags */}
            {selectedTags.filter(tag => !PREDEFINED_TAGS.includes(tag)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags.filter(tag => !PREDEFINED_TAGS.includes(tag)).map(tag => (
                  <span
                    key={tag}
                    className={`px-3 py-1 text-sm font-medium flex items-center gap-1 ${t.tagActive}`}
                  >
                    {tag}
                    <button onClick={() => toggleTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vital Preset toggle */}
        {hasPreset && (
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={() => setIncludePreset(!includePreset)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div
                className={`relative w-10 h-5 flex-shrink-0 rounded-full transition-colors ${
                  includePreset
                    ? theme === 'dark' ? 'bg-white' : 'bg-ember-600'
                    : theme === 'dark' ? 'bg-zinc-800' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
                    includePreset
                      ? theme === 'dark' ? 'bg-black' : 'bg-white'
                      : theme === 'dark' ? 'bg-zinc-500' : 'bg-white'
                  }`}
                  style={{ left: includePreset ? '22px' : '2px' }}
                />
              </div>
              <div>
                <div className={`text-sm font-medium flex items-center gap-1.5 ${t.text}`}>
                  <Download className="w-3.5 h-3.5" />
                  Include Vital Preset
                </div>
                <div className={`text-xs ${t.textMuted}`}>
                  Attach "{presetName}" preset for others to download
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-inherit">
          <button onClick={onClose} className={`px-4 py-2 text-sm font-medium ${t.buttonSecondary}`}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || publishing}
            className={`px-6 py-2 text-sm font-medium flex items-center gap-2 ${t.buttonPrimary} disabled:opacity-50`}
          >
            {publishing ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {presetStatus || (publishing ? 'Publishing...' : 'Publish')}
          </button>
        </div>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
}
