import { X, Copy, Check, GitCompare, SplitSquareHorizontal } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import * as Diff from 'diff';

interface RawMarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  originalContent?: string;
  filename: string;
}

type ViewMode = 'split' | 'unified';

export function RawMarkdownModal({ isOpen, onClose, content, originalContent, filename }: RawMarkdownModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const showComparison = originalContent && originalContent !== content;

  // Calculate diff
  const diffResult = useMemo(() => {
    if (!showComparison || !originalContent) return null;
    return Diff.diffLines(originalContent, content);
  }, [showComparison, originalContent, content]);

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

  const handleCopyOriginal = async () => {
    if (!originalContent) return;
    try {
      await navigator.clipboard.writeText(originalContent);
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
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
        className={`bg-background rounded-lg shadow-xl w-full ${showComparison ? 'max-w-7xl' : 'max-w-4xl'} max-h-[90vh] flex flex-col border overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {showComparison ? 'View Changes' : 'Raw Markdown'}
            </h2>
            <p className="text-sm text-muted-foreground truncate hidden sm:block">{filename}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showComparison && (
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                <button
                  onClick={() => setViewMode('split')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'split' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  title="Split view"
                >
                  <SplitSquareHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Split</span>
                </button>
                <button
                  onClick={() => setViewMode('unified')}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'unified' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                  title="Unified diff"
                >
                  <GitCompare className="h-4 w-4" />
                  <span className="hidden sm:inline">Unified</span>
                </button>
              </div>
            )}
            {!showComparison && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors font-medium"
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
            )}
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center justify-center"
              title="Close"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {showComparison ? (
          viewMode === 'unified' ? (
            // Unified Diff View (GitHub style)
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="font-mono text-xs sm:text-sm">
                {diffResult?.map((part, index) => {
                  const lines = part.value.split('\n');
                  // Remove last empty line if exists
                  if (lines[lines.length - 1] === '') lines.pop();
                  
                  return lines.map((line, lineIndex) => {
                    const isAdded = part.added;
                    const isRemoved = part.removed;

                    return (
                      <div
                        key={`${index}-${lineIndex}`}
                        className={`flex min-w-0 ${
                          isAdded
                            ? 'bg-green-50 dark:bg-green-950/30'
                            : isRemoved
                            ? 'bg-red-50 dark:bg-red-950/30'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block w-12 flex-shrink-0 px-2 py-0.5 text-right select-none border-r ${
                            isAdded
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800'
                              : isRemoved
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800'
                              : 'bg-muted/30 text-muted-foreground/50 border-border'
                          }`}
                        >
                          {isAdded ? '+' : isRemoved ? '-' : ' '}
                        </span>
                        <span
                          className={`flex-1 min-w-0 px-3 py-0.5 whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                            isAdded
                              ? 'text-green-800 dark:text-green-200'
                              : isRemoved
                              ? 'text-red-800 dark:text-red-200'
                              : ''
                          }`}
                        >
                          {line || ' '}
                        </span>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          ) : (
            // Split Diff View (GitHub style)
            <div className="flex-1 overflow-hidden flex flex-col sm:flex-row min-w-0">
              {/* Original (Left) */}
              <div className="flex-1 flex flex-col border-b sm:border-b-0 sm:border-r min-w-0 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                  <h3 className="text-sm font-semibold">Original</h3>
                  <button
                    onClick={handleCopyOriginal}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-input bg-background hover:bg-accent transition-colors"
                    title="Copy original"
                  >
                    {copiedOriginal ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span className="hidden sm:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="font-mono text-xs sm:text-sm">
                    {originalContent?.split('\n').map((line, index) => {
                      const diffLine = diffResult?.find(d => {
                        const lines = d.value.split('\n');
                        return (d.removed || !d.added) && lines.includes(line);
                      });
                      const isRemoved = diffLine?.removed;

                      return (
                        <div
                          key={index}
                          className={`flex min-w-0 ${
                            isRemoved ? 'bg-red-50 dark:bg-red-950/30' : ''
                          }`}
                        >
                          <span
                            className={`inline-block w-12 flex-shrink-0 px-2 py-0.5 text-right select-none border-r ${
                              isRemoved
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800'
                                : 'bg-muted/30 text-muted-foreground/50 border-border'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span
                            className={`flex-1 min-w-0 px-3 py-0.5 whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                              isRemoved
                                ? 'text-red-800 dark:text-red-200'
                                : ''
                            }`}
                          >
                            {line || ' '}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Edited (Right) */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">Edited (To Save)</h3>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-input bg-background hover:bg-accent transition-colors"
                    title="Copy edited"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span className="hidden sm:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <div className="font-mono text-xs sm:text-sm">
                    {content.split('\n').map((line, index) => {
                      const diffLine = diffResult?.find(d => {
                        const lines = d.value.split('\n');
                        return (d.added || !d.removed) && lines.includes(line);
                      });
                      const isAdded = diffLine?.added;

                      return (
                        <div
                          key={index}
                          className={`flex min-w-0 ${
                            isAdded ? 'bg-green-50 dark:bg-green-950/30' : ''
                          }`}
                        >
                          <span
                            className={`inline-block w-12 flex-shrink-0 px-2 py-0.5 text-right select-none border-r ${
                              isAdded
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800'
                                : 'bg-muted/30 text-muted-foreground/50 border-border'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span
                            className={`flex-1 min-w-0 px-3 py-0.5 whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                              isAdded
                                ? 'text-green-800 dark:text-green-200'
                                : ''
                            }`}
                          >
                            {line || ' '}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
            <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words overflow-wrap-anywhere">
              <code>{content}</code>
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 gap-3 flex-wrap">
          {!showComparison ? (
            <p className="text-sm text-muted-foreground">
              {content.split('\n').length} lines • {content.length} chars
            </p>
          ) : (
            <div className="text-sm text-muted-foreground flex gap-4">
              <span>
                {diffResult?.filter(d => d.added).reduce((acc, d) => acc + d.value.split('\n').length - 1, 0) || 0} additions
              </span>
              <span>
                {diffResult?.filter(d => d.removed).reduce((acc, d) => acc + d.value.split('\n').length - 1, 0) || 0} deletions
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

