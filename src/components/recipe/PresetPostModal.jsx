import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Send, Tag, Upload, FileMusic, Loader, AlertCircle } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const PREDEFINED_TAGS = ['Bass', 'Lead', 'Pad', 'Pluck', 'Kick', 'Drums', 'Strings', 'Vocal', 'FX'];

/**
 * Modal for posting a standalone Vital preset directly to the feed.
 * User provides a .vital file, title, description, and tags.
 */
export function PresetPostModal({ isOpen, onClose, onSubmit, theme, status, error }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const focusTrapRef = useFocusTrap(isOpen);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Hide dock when modal is open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('dock-visibility', { detail: { hidden: isOpen } }));
    return () => window.dispatchEvent(new CustomEvent('dock-visibility', { detail: { hidden: false } }));
  }, [isOpen]);

  const t = theme === 'dark' ? {
    overlay: 'bg-black/70',
    modal: 'bg-zinc-900 border-zinc-700',
    text: 'text-white',
    textMuted: 'text-zinc-400',
    textDimmed: 'text-zinc-500',
    input: 'bg-zinc-950 border-zinc-700 text-white placeholder-zinc-500 rounded-md',
    tag: 'bg-zinc-800 text-white hover:bg-zinc-700 rounded-full',
    tagActive: 'bg-white text-black rounded-full',
    buttonPrimary: 'bg-white text-black hover:bg-zinc-200 rounded-md',
    buttonSecondary: 'bg-zinc-800 text-white hover:bg-zinc-700 rounded-md',
    dropzone: 'border-zinc-700 hover:border-zinc-500 rounded-lg',
    dropzoneActive: 'border-white bg-zinc-900 rounded-lg',
    fileCard: 'bg-zinc-950 border-zinc-700 rounded-lg',
  } : {
    overlay: 'bg-black/40',
    modal: 'bg-white border-stone-200',
    text: 'text-stone-900',
    textMuted: 'text-stone-500',
    textDimmed: 'text-stone-400',
    input: 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 rounded-md',
    tag: 'bg-amber-50 text-ember-700 border border-stone-200 hover:bg-amber-100 rounded-full',
    tagActive: 'bg-ember-600 text-white rounded-full',
    buttonPrimary: 'bg-ember-600 text-white hover:bg-ember-700 shadow-lg shadow-ember-500/20 rounded-md',
    buttonSecondary: 'bg-stone-900 text-white hover:bg-stone-800 rounded-md',
    dropzone: 'border-stone-200 hover:border-ember-600 rounded-lg',
    dropzoneActive: 'border-ember-600 bg-amber-50 rounded-lg',
    fileCard: 'bg-amber-50 border-stone-200 rounded-lg',
  };

  const isPosting = status && status !== 'idle' && status !== 'done' && status !== 'error';

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

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.vital') || f.type === 'application/json')) {
      setFile(f);
      // Auto-fill title from filename if empty
      if (!title) {
        const name = f.name.replace(/\.vital$/, '').replace(/[_-]/g, ' ');
        setTitle(name);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !file) return;
    await onSubmit({ file, title, description, tags: selectedTags });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AnimatePresence>
    {isOpen && (
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
        aria-labelledby="preset-post-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
        className={`w-full max-w-lg border rounded-lg ${t.modal} shadow-2xl max-h-[90vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <h2 id="preset-post-modal-title" className={`text-lg font-bold ${t.text}`}>Post Vital Preset</h2>
          <button onClick={onClose} className={`p-1.5 rounded-md transition-colors ${t.textMuted} ${theme === 'dark' ? 'hover:bg-zinc-800 hover:text-white' : 'hover:bg-stone-100 hover:text-stone-900'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* File Upload */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${t.textMuted}`}>Preset File</label>
            {file ? (
              <div className={`flex items-center justify-between p-3 border ${t.fileCard}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <FileMusic className={`w-8 h-8 flex-shrink-0 ${theme === 'dark' ? 'text-ember-500' : 'text-ember-600'}`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${t.text}`}>{file.name}</div>
                    <div className={`text-xs ${t.textDimmed}`}>{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className={`p-1 flex-shrink-0 transition-colors ${t.textMuted} ${theme === 'dark' ? 'hover:text-white' : 'hover:text-stone-900'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border-2 border-dashed cursor-pointer transition-colors ${
                  dragOver ? t.dropzoneActive : t.dropzone
                }`}
              >
                <Upload className={`w-8 h-8 mb-2 ${t.textMuted}`} />
                <span className={`text-sm font-medium ${t.text}`}>
                  Drop your .vital file here
                </span>
                <span className={`text-xs mt-1 ${t.textDimmed}`}>
                  or click to browse
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".vital"
              className="hidden"
              onChange={e => {
                const f = e.target.files[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* Title */}
          <div>
            <label htmlFor="preset-post-title" className={`block text-sm font-medium mb-1 ${t.textMuted}`}>Title</label>
            <input
              id="preset-post-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border ${t.input} focus:outline-none`}
              placeholder="Name your preset..."
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="preset-post-description" className={`block text-sm font-medium mb-1 ${t.textMuted}`}>Description</label>
            <textarea
              id="preset-post-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={`w-full px-3 py-2 border ${t.input} focus:outline-none resize-none`}
              rows={3}
              placeholder="Describe the sound, how you made it, what it's good for..."
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="preset-post-custom-tag" className={`block text-sm font-medium mb-2 ${t.textMuted}`}>Tags</label>
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
            <div className="flex gap-2">
              <input
                id="preset-post-custom-tag"
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

        {/* Error */}
        {error && (
          <div className="px-4 pb-2">
            <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-inherit">
          <button onClick={onClose} className={`px-4 py-2 text-sm font-medium ${t.buttonSecondary}`}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !file || isPosting}
            className={`px-6 py-2 text-sm font-medium flex items-center gap-2 ${t.buttonPrimary} disabled:opacity-50`}
          >
            {isPosting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {status === 'validating' ? 'Validating...' : status === 'uploading' ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post Preset
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
