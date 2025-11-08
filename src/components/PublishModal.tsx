import { useState, useEffect } from 'react';
import { X, GitBranch, Upload, AlertCircle, CheckCircle, Terminal, Copy, Lightbulb, Send } from 'lucide-react';
import type { GitStatus } from '@/lib/gitOperations';

interface PublishResult {
  pushed?: boolean;
  needsManualPush?: boolean;
  commitSha?: string;
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (commitMessage: string) => Promise<PublishResult | void>;
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
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      console.log('📝 Publish Modal opened:', {
        fileName,
        hasGitRepo: gitStatus?.isGitRepo,
        currentBranch: gitStatus?.currentBranch,
        projectPath,
      });
      setCommitMessage(defaultMessage);
      setIsPublishing(false);
      setPublishSuccess(false);
      setPublishError(null);
      setPublishResult(null);
      setCopied(false);
    }
  }, [isOpen, defaultMessage, fileName, gitStatus, projectPath]);

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
    if (!commitMessage.trim() || isPublishing) {
      console.log('❌ Publish blocked:', { 
        hasMessage: !!commitMessage.trim(), 
        isPublishing,
        gitStatus: gitStatus?.isGitRepo 
      });
      return;
    }

    console.log('🚀 Starting publish...', { fileName, commitMessage: commitMessage.substring(0, 50) });
    setIsPublishing(true);
    setPublishError(null);
    try {
      const result = await onPublish(commitMessage);
      console.log('✅ Publish completed:', result);
      // Don't close modal, show success state instead
      setPublishSuccess(true);
      setPublishError(null);
      setPublishResult(result || null);
    } catch (error) {
      console.error('❌ Publish error:', error);
      setPublishSuccess(false);
      setPublishError(error instanceof Error ? error.message : 'Failed to publish changes');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setPublishSuccess(false);
    setPublishError(null);
    setPublishResult(null);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={isPublishing || publishSuccess ? undefined : handleClose}
    >
      <div 
        className="bg-background rounded-lg shadow-xl border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md shrink-0 ${
              publishSuccess 
                ? publishResult?.pushed 
                  ? 'bg-success/10 text-success' 
                  : 'bg-info/10 text-info'
                : 'bg-primary/10 text-primary'
            }`}>
              {publishSuccess ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <Upload className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold">
                {publishSuccess 
                  ? publishResult?.pushed 
                    ? 'Published Successfully' 
                    : 'Commit Created'
                  : 'Publish Changes'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{fileName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPublishing}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-accent transition-colors inline-flex items-center justify-center disabled:opacity-50 shrink-0 touch-target"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Success State */}
            {publishSuccess ? (
              <>
                {/* Success Message */}
                <div className={`rounded-lg border p-3 sm:p-4 ${
                  publishResult?.pushed 
                    ? 'border-success/50 bg-success/10' 
                    : 'border-info/50 bg-info/10'
                }`}>
                  <div className="flex gap-2 sm:gap-3">
                    <CheckCircle className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5 ${
                      publishResult?.pushed ? 'text-success' : 'text-info'
                    }`} />
                    <div className="space-y-2 text-xs sm:text-sm flex-1">
                      {publishResult?.pushed ? (
                        <>
                          <p className="font-medium text-success">
                            Changes committed and pushed successfully
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Your changes are now live on the remote repository.
                          </p>
                          {publishResult?.commitSha && (
                            <p className="text-xs text-muted-foreground font-mono mt-2">
                              Commit: {publishResult.commitSha}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-info">
                            Commit created, but push failed
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Your changes have been <strong>committed locally</strong>. However, they could not be pushed to the remote repository.
                          </p>
                          {publishResult?.commitSha && (
                            <p className="text-xs text-muted-foreground font-mono mt-2">
                              Commit: {publishResult.commitSha}
                            </p>
                          )}
                          <div className="pt-3 mt-3 border-t border-info/20">
                            <p className="text-xs text-info">
                              <strong>Likely reason:</strong> Your repository uses SSH protocol, which cannot be pushed from the browser due to security restrictions.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Next Steps - Only show if push was not successful */}
                {publishResult?.needsManualPush && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Manual Push Required
                    </h3>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Run this command in your terminal to push to the remote repository:
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md hover:bg-background transition-colors"
                        title="Copy push command"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-success" />
                            <span className="text-success">Copied!</span>
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
                  <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <strong>How to push:</strong>
                    </p>
                    <ol className="space-y-1 ml-4 list-decimal">
                      <li>Open Terminal in your project directory</li>
                      <li>Paste the command above (click Copy button)</li>
                      <li>Press Enter to execute</li>
                    </ol>
                  </div>
                </div>
                )}
              </>
            ) : (
              /* Regular Publish Form */
              <>
            {/* Git Status */}
            {gitStatus && (
              <div className="space-y-3">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
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
                    className="text-xs text-muted-foreground hover:text-foreground underline px-2 py-1 sm:px-3 sm:py-1.5 self-start xs:self-auto touch-target"
                    title="Show debug info in console"
                  >
                    Debug Info
                  </button>
                </div>

                {!gitStatus.isGitRepo && (
                  <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                      <div className="space-y-2 text-sm">
                        <p className="font-medium text-warning">Git Repository Not Found</p>
                        <p className="text-muted-foreground">
                          The selected folder doesn't contain a <code className="px-1 py-0.5 bg-muted rounded">.git</code> directory.
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1 mt-2 pt-2 border-t border-warning/20">
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
                  <div className="rounded-lg border border-success/50 bg-success/10 p-4">
                    <div className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-success">Git Repository Detected</p>
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
              <label className="text-xs sm:text-sm font-medium">
                Commit Message <span className="text-destructive">*</span>
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isPublishing}
                className="w-full min-h-[100px] sm:min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                placeholder="Enter commit message..."
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Describe your changes. Press <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-muted border text-[10px] sm:text-xs">⌘/Ctrl+Enter</kbd> to publish.
              </p>
            </div>

            {/* Error Message */}
            {publishError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm flex-1">
                    <p className="font-medium text-destructive">Publish Failed</p>
                    <p className="text-muted-foreground">{publishError}</p>
                    <button
                      onClick={handlePublish}
                      disabled={isPublishing || !commitMessage.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Upload className="h-4 w-4" />
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
        <div className="flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 border-t bg-muted/30">
            {publishSuccess ? (
              /* Success Footer */
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md hover:bg-background transition-colors"
                    title="Copy command"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-success" />
                        <span className="text-success">Copied!</span>
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
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50 touch-target"
              >
                Cancel
              </button>
              
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3">
                {terminalCommand && gitStatus?.isGitRepo && (
                  <button
                    onClick={handleCopyAndShowInstructions}
                    disabled={isPublishing || !commitMessage.trim()}
                    className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md border-2 border-primary bg-background hover:bg-primary/10 transition-colors text-sm font-medium disabled:opacity-50 disabled:pointer-events-none text-primary touch-target"
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
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                  title={
                    !gitStatus?.isGitRepo 
                      ? 'Git repository not found' 
                      : !commitMessage.trim() 
                        ? 'Commit message required' 
                        : 'Commit and push changes'
                  }
                >
                  {isPublishing ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span className="hidden xs:inline">Publishing...</span>
                      <span className="xs:hidden">...</span>
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
  );
}

