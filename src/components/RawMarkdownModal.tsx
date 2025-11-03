import { X, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface RawMarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  filename: string;
}

export function RawMarkdownModal({ isOpen, onClose, content, filename }: RawMarkdownModalProps) {
  const [copied, setCopied] = useState(false);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Silently handle copy error
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold truncate">Raw Markdown</h2>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{filename}</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-2 sm:px-3 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors touch-target"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors touch-target inline-flex items-center justify-center"
              title="Close"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words">
            <code>{content}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-t bg-muted/30 gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">
            {content.split('\n').length} lines • {content.length} chars
          </p>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors touch-target"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

