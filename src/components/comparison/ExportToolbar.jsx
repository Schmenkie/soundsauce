import { useCallback } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { useToast } from '../ui/Toast';

/**
 * Copy + Share toolbar — uses toast for feedback.
 */
export function ExportToolbar({ onCopy, onShare, theme }) {
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await onCopy();
      toast.success('Analysis copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [onCopy, toast]);

  const handleShare = useCallback(async () => {
    if (!onShare) return;
    try {
      const { text, title } = onShare();

      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Share text copied to clipboard');
      }
    } catch (err) {
      // User cancelled the share dialog — not an error
      if (err?.name === 'AbortError') return;
      toast.error('Failed to share');
    }
  }, [onShare, toast]);

  const buttonClass = `flex items-center gap-2 px-5 py-2.5 transition-all font-medium rounded-md ${
    theme === 'dark'
      ? 'bg-zinc-700 text-white hover:bg-zinc-600'
      : 'bg-stone-900 text-white hover:bg-stone-800'
  }`;

  return (
    <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3">
      <button onClick={handleCopy} className={buttonClass}>
        <Copy className="w-5 h-5" />
        <span>Copy</span>
      </button>
      {onShare && (
        <button onClick={handleShare} className={buttonClass}>
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      )}
    </div>
  );
}
