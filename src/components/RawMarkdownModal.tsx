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
  const [splitWidth, setSplitWidth] = useState(() => {
    const saved = localStorage.getItem('rawMarkdownSplitWidth');
    return saved ? parseInt(saved, 10) : 50; // Default 50% (percentage)
  });
  const [isResizing, setIsResizing] = useState(false);
  const hasChanges = originalContent && originalContent !== content;

  // Calculate diff
  const diffResult = useMemo(() => {
    if (!hasChanges || !originalContent) return null;
    return Diff.diffLines(originalContent, content);
  }, [hasChanges, originalContent, content]);

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

  // Handle resizing split view
  useEffect(() => {
    if (!isResizing) return;

    // Disable text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      // Find the split container
      const splitContainer = document.querySelector('[data-split-container]') as HTMLElement;
      if (!splitContainer) return;
      
      const rect = splitContainer.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      // Min 20%, Max 80%
      const newWidth = Math.max(20, Math.min(80, percentage));
      setSplitWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // Save to localStorage
      localStorage.setItem('rawMarkdownSplitWidth', splitWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Cleanup styles
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, splitWidth]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        id="raw-markdown-modal-content"
        className="bg-background rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              View Changes
            </h2>
            <p className="text-sm text-muted-foreground truncate hidden sm:block">{filename}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasChanges && (
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
        {hasChanges ? (
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
                            ? 'bg-success/10'
                            : isRemoved
                            ? 'bg-destructive/10'
                            : ''
                        }`}
                      >
                        <span
                          className={`inline-block w-12 flex-shrink-0 px-2 py-0.5 text-right select-none border-r ${
                            isAdded
                              ? 'bg-success/20 text-success border-success/30'
                              : isRemoved
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : 'bg-muted/30 text-muted-foreground/50 border-border'
                          }`}
                        >
                          {isAdded ? '+' : isRemoved ? '-' : ' '}
                        </span>
                        <span
                          className={`flex-1 min-w-0 px-3 py-0.5 whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                            isAdded
                              ? 'text-success'
                              : isRemoved
                              ? 'text-destructive'
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
            <div data-split-container className="flex-1 overflow-hidden flex flex-col sm:flex-row min-w-0 relative">
              {/* Original (Left) */}
              <div 
                className="flex flex-col border-b sm:border-b-0 sm:border-r min-w-0 overflow-hidden" 
                style={{ width: `${splitWidth}%` }}
              >
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
                            isRemoved ? 'bg-destructive/10' : ''
                          }`}
                        >
                          <span
                            className={`inline-block w-12 flex-shrink-0 px-2 py-0.5 text-right select-none border-r ${
                              isRemoved
                                ? 'bg-destructive/20 text-destructive border-destructive/30'
                                : 'bg-muted/30 text-muted-foreground/50 border-border'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span
                            className={`flex-1 min-w-0 px-3 py-0.5 whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                              isRemoved
                                ? 'text-destructive'
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

              {/* Resize Handle */}
              <div
                className="hidden sm:block absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/70 bg-border transition-colors z-50"
                style={{ left: `${splitWidth}%`, transform: 'translateX(-50%)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsResizing(true);
                }}
                title="Drag to resize"
              >
                <div className="absolute inset-y-0 -left-2 w-5" />
              </div>

              {/* Edited (Right) */}
              <div 
                className="flex flex-col min-w-0 overflow-hidden" 
                style={{ width: `${100 - splitWidth}%` }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                  <h3 className="text-sm font-semibold text-success">Edited (To Save)</h3>
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
                            isAdded ? 'bg-success/10' : ''
                          }`}
                        >
                          <span
                            className={`inline-block w-12 flex-shrink-0 px-2 py-0.5 text-right select-none border-r ${
                              isAdded
                                ? 'bg-success/20 text-success border-success/30'
                                : 'bg-muted/30 text-muted-foreground/50 border-border'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span
                            className={`flex-1 min-w-0 px-3 py-0.5 whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                              isAdded
                                ? 'text-success'
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
          // No changes - show original on left, "No changes" message on right
          <div data-split-container className="flex-1 overflow-hidden flex flex-col sm:flex-row min-w-0 relative">
            {/* Original (Left) */}
            <div 
              className="flex flex-col border-b sm:border-b-0 sm:border-r min-w-0 overflow-hidden" 
              style={{ width: `${splitWidth}%` }}
            >
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
                  {(originalContent || content).split('\n').map((line, index) => (
                    <div key={index} className="flex min-w-0">
                      <span className="inline-block w-12 flex-shrink-0 px-2 py-0.5 text-right select-none border-r bg-muted/30 text-muted-foreground/50 border-border">
                        {index + 1}
                      </span>
                      <span className="flex-1 min-w-0 px-3 py-0.5 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                        {line || ' '}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resize Handle */}
            <div
              className="hidden sm:block absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/70 bg-border transition-colors z-50"
              style={{ left: `${splitWidth}%`, transform: 'translateX(-50%)' }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
              }}
              title="Drag to resize"
            >
              <div className="absolute inset-y-0 -left-2 w-5" />
            </div>

            {/* No Changes Message (Right) */}
            <div 
              className="flex flex-col min-w-0 overflow-hidden" 
              style={{ width: `${100 - splitWidth}%` }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                <h3 className="text-sm font-semibold">Current</h3>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-input bg-background hover:bg-accent transition-colors"
                  title="Copy current"
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
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex items-center justify-center p-8">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success">
                    <Check className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">No Changes</p>
                    <p className="text-sm text-muted-foreground">
                      The current version matches the saved version
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 gap-3 flex-wrap">
          {hasChanges ? (
            <div className="text-sm text-muted-foreground flex gap-4">
              <span>
                {diffResult?.filter(d => d.added).reduce((acc, d) => acc + d.value.split('\n').length - 1, 0) || 0} additions
              </span>
              <span>
                {diffResult?.filter(d => d.removed).reduce((acc, d) => acc + d.value.split('\n').length - 1, 0) || 0} deletions
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No changes to display
            </p>
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

