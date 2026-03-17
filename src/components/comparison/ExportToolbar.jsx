import { useCallback } from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '../ui/Toast';

/**
 * Copy toolbar — uses toast for feedback instead of inline state.
 */
export function ExportToolbar({ onCopy, theme }) {
  const { toast } = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await onCopy();
      toast.success('Analysis copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [onCopy, toast]);

  return (
    <div className="flex flex-wrap justify-center sm:justify-end gap-2 sm:gap-3">
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-5 py-2.5 transition-all font-medium rounded-md ${
          theme === 'dark'
            ? 'bg-zinc-700 text-white hover:bg-zinc-600'
            : 'bg-stone-900 text-white hover:bg-stone-800'
        }`}
      >
        <Copy className="w-5 h-5" />
        <span>Copy</span>
      </button>
    </div>
  );
}
