import { useState, useEffect } from 'react';
import { X, GitBranch, Upload, AlertCircle, CheckCircle, Terminal, Copy, Clipboard, Rocket, Lightbulb, Send } from 'lucide-react';
import type { GitStatus } from '@/lib/gitOperations';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (commitMessage: string) => Promise<void>;
  fileName: string;
  gitStatus: GitStatus | null;
  defaultMessage: string;
  projectPath?: string;
}

export function PublishModal({
  isOpen,
  onClose,
  onPublish,
  fileName,
  gitStatus,
  defaultMessage,
  projectPath,
}: PublishModalProps) {
  const [commitMessage, setCommitMessage] = useState(defaultMessage);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCommitMessage(defaultMessage);
      setIsPublishing(false);
      setPublishSuccess(false);
      setPublishError(null);
      setCopied(false);
    }
  }, [isOpen, defaultMessage]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPublishing) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isPublishing]);

  const handlePublish = async () => {
    if (!commitMessage.trim() || isPublishing) return;

    setIsPublishing(true);
    setPublishError(null);
    try {
      await onPublish(commitMessage);
      // Don't close modal, show success state instead
      setPublishSuccess(true);
      setPublishError(null);
    } catch (error) {
      console.error('Publish error:', error);
      setPublishSuccess(false);
      setPublishError(error instanceof Error ? error.message : 'Failed to publish changes');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setPublishSuccess(false);
    setPublishError(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePublish();
    }
  };

  // Generate terminal command - without cd since we can't get full path from browser
  // User needs to be in the correct directory already
  const terminalCommand = gitStatus?.currentBranch
    ? `git add "${fileName}" && git commit -m "${commitMessage.replace(/"/g, '\\"')}" && git push origin ${gitStatus.currentBranch}`
    : '';

  const handleCopyCommand = async () => {
    if (!terminalCommand) return;
    
    try {
      await navigator.clipboard.writeText(terminalCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyAndShowInstructions = async () => {
    if (!terminalCommand) return;
    
    // Copy command to clipboard
    await handleCopyCommand();
    
    const isMac = navigator.userAgent.toLowerCase().includes('mac');
    const terminalName = isMac ? 'Terminal' : 'Command Prompt/PowerShell';
    
    // Try to open terminal via URL schemes (may not work due to browser security)
    if (isMac) {
      // Try iTerm2 first (if installed)
      try {
        window.location.href = `iterm2://open?url=file://${projectPath || ''}`;
      } catch (e) {
        // iTerm2 not installed, that's OK
      }
      
      // Try to trigger macOS open command (usually blocked by browser)
      try {
        window.open('x-apple-terminal://');
      } catch (e) {
        // Expected to fail
      }
    }
    
    // Show instructions regardless (since terminal opening usually fails)
    setTimeout(() => {
      const projectName = projectPath || 'your project folder';
      alert(`✓ Command copied to clipboard!\n\nNext steps:\n\n1. Open ${terminalName} ${isMac ? '(Cmd+Space → "Terminal")' : ''}\n2. Navigate to your project:\n   cd /path/to/${projectName}\n3. Paste the command (${isMac ? 'Cmd' : 'Ctrl'}+V)\n4. Press Enter\n\nThe command will add, commit, and push automatically!\n\n${isMac ? 'Tip: If you have iTerm2, it might open automatically!' : ''}`);
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={isPublishing ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-background rounded-lg shadow-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${publishSuccess ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                {publishSuccess ? <CheckCircle className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {publishSuccess ? 'Published Successfully!' : 'Publish Changes'}
                </h2>
                <p className="text-sm text-muted-foreground">{fileName}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isPublishing}
              className="p-2 rounded-md hover:bg-accent transition-colors touch-target inline-flex items-center justify-center disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
            {/* Success State */}
            {publishSuccess ? (
              <>
                {/* Success Message */}
                <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                  <div className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm flex-1">
                      <p className="font-medium text-green-500">Commit Created Successfully!</p>
                      <p className="text-muted-foreground">
                        Your changes have been committed to the local repository.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Next Step: Push to Remote
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    To publish your changes to the remote repository, run this command in your terminal:
                  </p>
                  
                  {/* Terminal Command */}
                  <div className="p-3 bg-muted/50 rounded-md space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Terminal className="h-3 w-3" />
                        Push Command
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(`git push origin ${gitStatus?.currentBranch || 'main'}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          } catch (error) {
                            console.error('Failed to copy:', error);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-background transition-colors"
                        title="Copy push command"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-green-500">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block text-xs bg-background p-2 rounded border overflow-x-auto whitespace-nowrap">
                      git push origin {gitStatus?.currentBranch || 'main'}
                    </code>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Run this in your <strong>{projectPath || 'project'}</strong> directory
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-700 dark:text-blue-400">
                    <p className="font-medium mb-2 flex items-center gap-1.5">
                      <Clipboard className="h-3.5 w-3.5 shrink-0" />
                      How to push:
                    </p>
                    <ol className="space-y-1 ml-4 list-decimal">
                      <li>Open Terminal in your project folder</li>
                      <li>Paste the command above (or click Copy)</li>
                      <li>Press Enter</li>
                      <li className="flex items-center gap-1.5">
                        Your changes will be published!
                        <Rocket className="h-3.5 w-3.5 inline" />
                      </li>
                    </ol>
                  </div>
                </div>
              </>
            ) : (
              /* Regular Publish Form */
              <>
            {/* Git Status */}
            {gitStatus && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="font-mono font-medium">
                      {gitStatus.currentBranch || 'main'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      console.log('Current Git Status:', gitStatus);
                      console.log('Press F12 and check Console tab for detailed logs');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    title="Show debug info in console"
                  >
                    Debug Info
                  </button>
                </div>

                {!gitStatus.isGitRepo && (
                  <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-yellow-500">Git Repository Not Found</p>
                        <p className="text-muted-foreground">
                          The selected folder doesn't contain a <code className="px-1 py-0.5 bg-muted rounded">.git</code> directory.
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1 mt-2 pt-2 border-t border-yellow-500/20">
                          <p className="font-medium flex items-center gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                            Troubleshooting:
                          </p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><strong>Wrong folder selected:</strong> You may have selected a subfolder (e.g., <code className="px-1 py-0.5 bg-muted rounded">posts/</code> folder). Go back and select the root project folder that contains <code className="px-1 py-0.5 bg-muted rounded">.git/</code></li>
                            <li><strong>Not initialized:</strong> Run <code className="px-1 py-0.5 bg-muted rounded">git init</code> in your project root</li>
                            <li><strong>Browser access:</strong> File System API may not show hidden folders like <code className="px-1 py-0.5 bg-muted rounded">.git/</code>. Check browser console (F12) for detailed logs</li>
                            <li><strong>Still works:</strong> Files will be saved locally even without Git</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {gitStatus.isGitRepo && (
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-green-500">Git Repository Detected</p>
                        <p className="text-muted-foreground">
                          Changes will be committed and pushed to <strong>{gitStatus.currentBranch || 'main'}</strong> branch.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Commit Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Commit Message <span className="text-destructive">*</span>
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPublishing}
                className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder="Enter commit message..."
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Describe your changes. Press <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">⌘/Ctrl+Enter</kbd> to publish.
              </p>
            </div>

            {/* Error Message */}
            {publishError && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm flex-1">
                    <p className="font-medium text-red-500">Publish Failed</p>
                    <p className="text-muted-foreground">{publishError}</p>
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing || !commitMessage.trim()}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions Info */}
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <p className="font-medium">Browser publish will:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Save the file to your local folder</li>
                <li>Stage the file (<code className="text-xs">git add {fileName}</code>)</li>
                <li>Create a commit with your message</li>
                <li>Attempt to push (may need manual push in terminal)</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                  <span><strong>For guaranteed push:</strong> Use the "Copy for Terminal" button and run the command in your terminal.</span>
                </p>
              </div>
            </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-3 p-4 sm:p-6 border-t shrink-0">
            {publishSuccess ? (
              /* Success Footer */
              <div className="flex items-center justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            ) : (
              /* Regular Footer */
              <>
            {/* Terminal Command Preview */}
            {terminalCommand && gitStatus?.isGitRepo && (
              <div className="p-3 bg-muted/50 rounded-md space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Terminal className="h-3 w-3" />
                    Terminal Command
                  </span>
                  <button
                    onClick={handleCopyCommand}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-background transition-colors"
                    title="Copy command"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <code className="block text-xs bg-background p-2 rounded border overflow-x-auto whitespace-nowrap">
                  {terminalCommand}
                </code>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Run this in your <strong>{projectPath || 'project'}</strong> directory
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-2">
                {terminalCommand && gitStatus?.isGitRepo && (
                  <button
                    onClick={handleCopyAndShowInstructions}
                    disabled={isPublishing || !commitMessage.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-primary bg-background hover:bg-primary/10 transition-colors text-sm font-medium disabled:opacity-50 disabled:pointer-events-none text-primary"
                    title="Open iTerm2 with command"
                  >
                    <Terminal className="h-4 w-4" />
                    <span className="hidden sm:inline">Open in iTerm2</span>
                    <span className="sm:hidden">iTerm2</span>
                  </button>
                )}
                
                <button
                  onClick={handlePublish}
                  disabled={!commitMessage.trim() || isPublishing || !gitStatus?.isGitRepo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isPublishing ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Publish
                    </>
                  )}
                </button>
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

