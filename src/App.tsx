import { useState, useEffect } from 'react';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { DataTable } from '@/components/DataTable';
import { RawMarkdownModal } from '@/components/RawMarkdownModal';
import { NewPostModal } from '@/components/NewPostModal';
import { PublishModal } from '@/components/PublishModal';
import { SidebarTabs } from '@/components/SidebarTabs';
import { Settings } from '@/components/Settings';
import { Sheet } from '@/components/ui/Sheet';
import { Toast, useToast } from '@/components/ui/Toast';
import { WelcomeWarningModal, shouldShowWarning } from '@/components/WelcomeWarningModal';
import { FileBrowser } from '@/components/FileBrowser';
import { selectDirectory, readDirectory, readFile, writeFile, deleteFile, isFileSystemAccessSupported } from '@/lib/fileSystem';
import { parseMarkdown, stringifyMarkdown, updateFrontmatter } from '@/lib/markdown';
import { getRecentFolders, addRecentFolder, clearRecentFolders, formatTimestamp } from '@/lib/recentFolders';
import { getSettings } from '@/lib/settings';
import { saveDirectoryHandle, loadDirectoryHandle, saveAppState, loadAppState, clearPersistedData } from '@/lib/persistedState';
import { checkGitStatus, publishFile, generateCommitMessage, type GitStatus } from '@/lib/gitOperations';
import { hideFile, getHiddenFiles } from '@/lib/hiddenFiles';
import type { FileTreeItem, MarkdownFile } from '@/types';
import { FolderOpen, Save, Clock, FileCode, Plus, RotateCcw, Settings as SettingsIcon, Github, AlertCircle, Upload, Lightbulb, ChevronDown, PanelRightOpen, PanelLeftClose, PanelLeft } from 'lucide-react';

type ViewMode = 'table' | 'editor' | 'settings';

function App() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [allPosts, setAllPosts] = useState<MarkdownFile[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<MarkdownFile | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasPendingPublish, setHasPendingPublish] = useState(false); // Track if user saved but hasn't published yet
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showRawModal, setShowRawModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showTitleInHeader, setShowTitleInHeader] = useState(false);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(true);
  const [fileTreeWidth, setFileTreeWidth] = useState(() => {
    const saved = localStorage.getItem('fileTreeWidth');
    return saved ? parseInt(saved, 10) : 256; // Default 256px (w-64 = 16rem = 256px)
  });
  const [isResizing, setIsResizing] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // Check if warning should be shown on mount
  useEffect(() => {
    setShowWarningModal(shouldShowWarning());
  }, []);

  // Update page title based on changes
  useEffect(() => {
    if (viewMode === 'editor' && currentFile) {
      const baseTitle = currentFile.frontmatter.title || currentFile.name || 'Untitled';
      document.title = hasChanges ? `🟠 ${baseTitle} - Markdown++` : `${baseTitle} - Markdown++`;
    } else if (viewMode === 'settings') {
      document.title = 'Settings - Markdown++';
    } else if (viewMode === 'table' && dirHandle) {
      document.title = `${dirHandle.name} - Markdown++`;
    } else {
      document.title = 'Markdown++';
    }
  }, [viewMode, currentFile, hasChanges, dirHandle]);

  const loadAllPosts = async (handle: FileSystemDirectoryHandle, fileTree: FileTreeItem[]) => {
    try {
      const posts: MarkdownFile[] = [];
      
      const loadFile = async (item: FileTreeItem) => {
        if (!item.isDirectory) {
          try {
            const content = await readFile(handle, item.path);
            const parsed = parseMarkdown(content, item.path, item.name);
            posts.push(parsed);
          } catch (error) {
            // Silently skip files that can't be loaded
          }
        } else if (item.children) {
          for (const child of item.children) {
            await loadFile(child);
          }
        }
      };

      for (const item of fileTree) {
        await loadFile(item);
      }

      // Minimum loading time for better UX (500ms)
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 500));
      await minLoadTime;

      setAllPosts(posts);
    } catch (error) {
      // Silently handle error
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleSelectDirectory = async () => {
    // Check browser support first
    if (!isFileSystemAccessSupported()) {
      showToast(
        'File System Access API is not supported on this device. Please use a desktop browser (Chrome, Edge, or Safari 15.2+).',
        'error'
      );
      return;
    }
    
    const handle = await selectDirectory();
    if (handle) {
      // Clear any existing toasts first
      hideToast();
      
      // Clear posts and start loading immediately
      setAllPosts([]);
      setIsLoadingPosts(true);
      
      setDirHandle(handle);
      addRecentFolder(handle);
      
      // Save to IndexedDB for persistence
      await saveDirectoryHandle(handle);
      
      const fileTree = await readDirectory(handle);
      setFileTree(fileTree);
      await loadAllPosts(handle, fileTree);
      
      // Check git status
      const status = await checkGitStatus(handle);
      setGitStatus(status);
      
      // Show git status to user
      if (!status.isGitRepo) {
        console.warn('⚠️ Git repository not found in:', handle.name);
        console.log('Selected folder:', handle.name);
        console.log('Error:', status.error);
        showToast(
          `Folder "${handle.name}" selected. Git repository not detected - publish feature will be limited.`,
          'info'
        );
      } else {
        console.log('✓ Git repository found in:', handle.name, '| Branch:', status.currentBranch);
      }
    }
  };

  // Restore directory and state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        // Try to load persisted directory handle
        const savedHandle = await loadDirectoryHandle();
        
        if (savedHandle) {
          // Clear any existing toasts
          hideToast();
          
          // Clear posts and start loading
          setAllPosts([]);
          setIsLoadingPosts(true);
          
          setDirHandle(savedHandle);
          addRecentFolder(savedHandle);
          
          // Load posts
          const fileTree = await readDirectory(savedHandle);
          setFileTree(fileTree);
          await loadAllPosts(savedHandle, fileTree);
          
          // Load app state
          const savedState = await loadAppState();
          if (savedState) {
            if (savedState.viewMode) {
              setViewMode(savedState.viewMode);
            }
            
            // Restore selected file if in editor mode
            if (savedState.selectedFilePath && savedState.viewMode === 'editor') {
              try {
                const fileContent = await readFile(savedHandle, savedState.selectedFilePath);
                const fileName = savedState.selectedFilePath.split('/').pop() || savedState.selectedFilePath;
                const parsed = parseMarkdown(fileContent, savedState.selectedFilePath, fileName);
                setCurrentFile(parsed);
                setSelectedFilePath(savedState.selectedFilePath);
              } catch (error) {
                // File might not exist anymore, silently fail
                console.warn('Could not restore file:', savedState.selectedFilePath);
              }
            }
          }
          
          // Check git status
          const status = await checkGitStatus(savedHandle);
          setGitStatus(status);
          
          if (!status.isGitRepo) {
            console.warn('⚠️ Restored folder is not a Git repository');
          }
          
          // Don't show toast on restore - it's confusing during other operations
          // showToast('Workspace restored', 'success', 2000);
        }
      } catch (error) {
        console.error('Failed to restore state:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreState();
  }, []);

  const handleLogout = async () => {
    // Check for unsaved changes
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them and logout?')) {
      return;
    }

    // Clear any existing toasts
    hideToast();

    // Clear persisted data from IndexedDB
    await clearPersistedData();

    // Clear state
    setDirHandle(null);
    setAllPosts([]);
    setSelectedFilePath(null);
    setCurrentFile(null);
    setHasChanges(false);
    setViewMode('table');
    
    // Don't show toast - the UI change (back to folder selection) is clear enough
  };

  const handleClearRecent = () => {
    if (window.confirm('Clear all recent folders?')) {
      clearRecentFolders();
      // Don't show toast before reload - it won't be visible anyway
      window.location.reload();
    }
  };

  const handleDiscardChanges = async () => {
    if (!currentFile || !dirHandle || !selectedFilePath || !hasChanges) return;

    const confirmMsg = 'Discard all unsaved changes?\n\nThis action cannot be undone.';
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      // Reload the file from disk
      const fileContent = await readFile(dirHandle, selectedFilePath);
      const parsed = parseMarkdown(fileContent, selectedFilePath, currentFile.name);
      
      setCurrentFile(parsed);
      setHasChanges(false);
      setHasPendingPublish(false); // Clear publish flag when discarding
      showToast('Changes discarded', 'info');
    } catch (error) {
      showToast('Failed to discard changes. Please try again.', 'error');
    }
  };

  const handleEditPost = (post: MarkdownFile) => {
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setCurrentFile(post);
    setSelectedFilePath(post.path);
    setHasChanges(false);
    setHasPendingPublish(false); // Reset publish flag when switching files
    setViewMode('editor');
    
    // Save state
    saveAppState({
      selectedFilePath: post.path,
      viewMode: 'editor',
    });
  };

  const handleDeletePost = async (post: MarkdownFile) => {
    if (!dirHandle) return;

    const confirmMsg = `Are you sure you want to delete "${post.frontmatter.title || post.name}"?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await deleteFile(dirHandle, post.path);

      // Show loading and refresh posts
      setIsLoadingPosts(true);
      const fileTree = await readDirectory(dirHandle);
      setFileTree(fileTree);
      await loadAllPosts(dirHandle, fileTree);

      // Clear current file if it was deleted
      if (currentFile?.path === post.path) {
        setCurrentFile(null);
        setSelectedFilePath(null);
        setHasChanges(false);
        setHasPendingPublish(false);
      }

      showToast('Post deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete file. Please try again.', 'error');
      setIsLoadingPosts(false);
    }
  };

  const handleHidePost = (post: MarkdownFile) => {
    if (!dirHandle) return;

    hideFile(dirHandle.name, post.path);
    showToast(`"${post.frontmatter.title || post.name}" hidden`, 'info');
  };

  const handleCreatePost = async (filename: string, title: string) => {
    if (!dirHandle) return;

    try {
      // Get default meta from settings
      const settings = getSettings();
      const defaultMeta = settings.defaultMeta || {};
      
      // Create new post with default frontmatter
      const today = new Date().toISOString().split('T')[0];
      const newPost: MarkdownFile = {
        name: filename,
        path: filename,
        content: '',
        frontmatter: {
          title: title,
          date: today,
          author: '',
          description: '',
          categories: [],
          tags: [],
          // Merge in default meta from settings
          ...defaultMeta,
        },
        rawContent: '',
      };

      // Convert to markdown string
      const content = stringifyMarkdown(newPost);

      // Write to file
      await writeFile(dirHandle, filename, content);

      // Show loading and refresh posts
      setIsLoadingPosts(true);
      const fileTree = await readDirectory(dirHandle);
      setFileTree(fileTree);
      await loadAllPosts(dirHandle, fileTree);

      // Load the new file
      const fileContent = await readFile(dirHandle, filename);
      const parsed = parseMarkdown(fileContent, filename, filename);
      
      setCurrentFile(parsed);
      setSelectedFilePath(filename);
      setHasChanges(false);
      setHasPendingPublish(true);
      setViewMode('editor');
      setShowNewPostModal(false);
    } catch (error) {
      showToast('Failed to create file. Please try again.', 'error');
      setIsLoadingPosts(false);
    }
  };

  const handleSave = async () => {
    if (!dirHandle || !currentFile || !selectedFilePath) return;
    
    try {
      const content = stringifyMarkdown(currentFile);
      await writeFile(dirHandle, selectedFilePath, content);
      
      // Update the post in allPosts
      const updatedPosts = allPosts.map(post => 
        post.path === currentFile.path ? currentFile : post
      );
      setAllPosts(updatedPosts);
      
      // Update states in one batch
      setHasChanges(false);
      setHasPendingPublish(true);
      
      showToast('Changes saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save file. Please try again.', 'error');
    }
  };

  const handlePublishClick = async () => {
    if (!dirHandle || !currentFile || !selectedFilePath) return;
    
    // First save the file if there are changes
    if (hasChanges) {
      await handleSave();
    }
    
    // Show publish modal
    setShowPublishModal(true);
  };

  const handlePublish = async (commitMessage: string) => {
    if (!dirHandle || !currentFile || !selectedFilePath) return;
    
    try {
      const result = await publishFile(dirHandle, {
        filePath: selectedFilePath,
        commitMessage,
        branch: gitStatus?.currentBranch || 'main',
      });
      
      if (result.success) {
        setHasPendingPublish(false);
        // Don't show toast - success is shown in modal
        // Return result to modal so it can show appropriate message
        return {
          pushed: result.pushed,
          needsManualPush: result.needsManualPush,
          commitSha: result.commitSha,
        };
      } else {
        // Throw error so modal can catch and show it
        throw new Error(result.error || 'Failed to publish changes');
      }
    } catch (error) {
      // Re-throw error so modal can catch it
      throw error;
    }
  };

  const handleContentChange = (content: string) => {
    if (currentFile) {
      setCurrentFile({ ...currentFile, content });
      setHasChanges(true);
    }
  };

  const handleMetaChange = (frontmatter: MarkdownFile['frontmatter']) => {
    if (currentFile) {
      const updated = updateFrontmatter(currentFile, frontmatter);
      setCurrentFile(updated);
      setHasChanges(true);
    }
  };

  const handleTitleChange = (title: string) => {
    if (currentFile) {
      const updated = updateFrontmatter(currentFile, {
        ...currentFile.frontmatter,
        title,
      });
      setCurrentFile(updated);
      setHasChanges(true);
    }
  };

  // Save view mode changes
  useEffect(() => {
    if (!isRestoring && dirHandle) {
      saveAppState({
        viewMode,
        selectedFilePath: viewMode === 'editor' ? selectedFilePath : null,
      });
    }
  }, [viewMode, selectedFilePath, dirHandle, isRestoring]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) handleSave();
      }
      if (e.key === 'Escape' && showActionsDropdown) {
        setShowActionsDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, currentFile, selectedFilePath, showActionsDropdown]);

  // Track scroll to show/hide title in header (only in editor mode)
  useEffect(() => {
    if (viewMode !== 'editor' || !currentFile) {
      setShowTitleInHeader(false);
      return;
    }

    const handleScroll = () => {
      const scrollContainer = document.querySelector('.flex-1.overflow-auto');
      if (scrollContainer) {
        // Show title in header when scrolled more than 100px
        setShowTitleInHeader(scrollContainer.scrollTop > 100);
      }
    };

    const scrollContainer = document.querySelector('.flex-1.overflow-auto');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [viewMode, currentFile]);

  // Handle resizing file tree panel
  useEffect(() => {
    if (!isResizing) return;

    // Disable text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const handleMouseMove = (e: MouseEvent) => {
      // Min width: 200px, Max width: 500px
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      setFileTreeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // Save to localStorage
      localStorage.setItem('fileTreeWidth', fileTreeWidth.toString());
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
  }, [isResizing, fileTreeWidth]);

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.flex-1.overflow-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!dirHandle) {
    // Show loading while restoring
    if (isRestoring) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16">
              <img src="/logo.png" alt="Markdown++" className="w-full h-full object-contain animate-pulse" />
            </div>
            <p className="text-muted-foreground animate-pulse">Restoring workspace...</p>
          </div>
        </div>
      );
    }

    const recentFolders = getRecentFolders();
    const isSupported = isFileSystemAccessSupported();
    
    return (
      <div className="flex h-screen items-center justify-center bg-background p-3 sm:p-4">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
          {/* Header */}
              <div className="text-center space-y-2 sm:space-y-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-2 cursor-pointer hover:scale-105 transition-transform"
                  title="Click to refresh"
                >
                  <img src="/logo.png" alt="Markdown++" className="w-full h-full object-contain" />
                </button>
                <h1 className="text-3xl sm:text-4xl font-bold">Markdown++</h1>
                <p className="text-muted-foreground text-base sm:text-lg px-4">
                  Select a folder to start editing your markdown files
                </p>
              </div>

          {/* Browser Compatibility Warning */}
          {!isSupported && (
            <div className="mx-auto max-w-xl">
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-yellow-500">Device Not Supported</p>
                    <p className="text-muted-foreground">
                      Local folder access is not available on iOS or iPadOS devices. 
                      Please use a <strong>desktop computer</strong> with <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Safari</strong> to access your local files.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                      <span><strong>Tip:</strong> Works on Android with Chrome/Edge</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSelectDirectory}
              disabled={!isSupported}
              className="inline-flex items-center gap-3 rounded-md bg-primary px-6 py-2.5 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:shadow-lg"
            >
              <FolderOpen className="h-5 w-5" />
              Select Folder
            </button>
          </div>

          {/* Recent Folders */}
          {recentFolders.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Folders
                </div>
                <button
                  onClick={handleClearRecent}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                >
                  Clear
                </button>
              </div>
              
              <div className="grid gap-2">
                {recentFolders.map((folder) => (
                  <button
                    key={folder.name + folder.timestamp}
                    onClick={handleSelectDirectory}
                    disabled={!isSupported}
                    className="flex items-center justify-between p-4 rounded-md border border-border bg-card hover:bg-accent active:bg-accent/80 transition-colors text-left group touch-target disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="shrink-0">
                        <FolderOpen className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm sm:text-base">{folder.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(folder.timestamp)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer with GitHub Link */}
          <div className="pt-6 border-t border-border">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <a
                href="https://github.com/emir/markdown-plus-plus"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent"
              >
                <Github className="h-4 w-4" />
                <span>View on GitHub</span>
              </a>
              <span className="text-muted-foreground/50">•</span>
              <span>v0.5.0-beta</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <>
      <WelcomeWarningModal
        isOpen={showWarningModal}
        onAccept={() => setShowWarningModal(false)}
      />
      
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={hideToast}
        duration={toast.duration}
      />
      
      <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="relative flex items-center px-2 sm:px-4 gap-2 sm:gap-4 h-14">
          {/* Logo and Title */}
          <button
            onClick={async () => {
              if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
                return;
              }
              // If in editor mode, go to table view
              if (viewMode === 'editor') {
                setViewMode('table');
                setCurrentFile(null);
                setSelectedFilePath(null);
                setHasChanges(false);
                setHasPendingPublish(false);
              } else if (viewMode === 'settings') {
                // If in settings, go to table view
                setViewMode('table');
              } else if (viewMode === 'table' && dirHandle) {
                // If in table view, refresh posts
                setIsLoadingPosts(true);
                const fileTree = await readDirectory(dirHandle);
                setFileTree(fileTree);
                await loadAllPosts(dirHandle, fileTree);
                showToast('Posts refreshed', 'success', 2000);
              }
            }}
            className="flex items-center gap-1.5 text-base sm:text-lg font-semibold opacity-40 hover:opacity-100 transition-all duration-500 ease-in-out group cursor-pointer relative z-10"
          >
            <img src="/logo.png" alt="Markdown++" className="w-6 h-6 sm:w-7 sm:h-7 object-contain group-hover:scale-105 transition-transform duration-500" />
            <span>Markdown++</span>
          </button>
          
          {/* Unsaved Changes Indicator */}
          {viewMode === 'editor' && hasChanges && (
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse -ml-1 relative z-10" title="Unsaved changes" />
          )}

          {/* Title in Header (when scrolled in editor) - Absolutely positioned to center */}
          {showTitleInHeader && viewMode === 'editor' && currentFile && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <div className="w-[720px] px-4">
                <div 
                  onClick={scrollToTop}
                  className={`font-bold text-center leading-tight truncate cursor-pointer hover:opacity-80 transition-opacity ${
                    (() => {
                      const title = currentFile.frontmatter.title || 'Untitled';
                      const length = title.length;
                      if (length > 60) return 'text-sm';
                      if (length > 40) return 'text-base';
                      if (length > 25) return 'text-lg';
                      return 'text-xl';
                    })()
                  }`}
                  title={currentFile.frontmatter.title || 'Untitled'}
                >
                  {currentFile.frontmatter.title || 'Untitled'}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 min-w-0"></div>
          
          <div className="ml-auto flex items-center gap-2 relative z-10">
            {viewMode !== 'editor' && (
              <>
                <button
                  onClick={() => setShowNewPostModal(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Post</span>
                </button>

                <button
                  onClick={() => setViewMode('settings')}
                  className="inline-flex items-center justify-center rounded-md bg-white dark:bg-white/10 h-9 w-9 hover:bg-white/90 dark:hover:bg-white/20 transition-colors shadow-sm"
                  title="Settings"
                >
                  <SettingsIcon className="h-4 w-4" />
                </button>
              </>
            )}

            {viewMode === 'editor' && currentFile && (
              <>
                {/* Actions Button Group */}
                <div className="relative flex items-stretch">
                  {/* Open Sidebar Button */}
                  <button
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-l-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Open Sidebar"
                  >
                    <PanelRightOpen className="h-4 w-4" />
                    <span>Sidebar</span>
                  </button>
                  
                  {/* Dropdown Toggle */}
                  <button
                    onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    className="inline-flex items-center justify-center rounded-r-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 transition-colors border-l border-primary-foreground/20"
                    title="More actions"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showActionsDropdown && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowActionsDropdown(false)}
                      />
                      
                      <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-md border border-border bg-background shadow-lg">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowRawModal(true);
                              setShowActionsDropdown(false);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
                          >
                            <FileCode className="h-4 w-4" />
                            <span>View Changes</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              handleDiscardChanges();
                              setShowActionsDropdown(false);
                            }}
                            disabled={!hasChanges}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Discard Changes</span>
                          </button>
                          
                          <div className="h-px bg-border my-1" />
                          
                          <button
                            onClick={() => {
                              handleSave();
                              setShowActionsDropdown(false);
                            }}
                            disabled={!hasChanges}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save Changes</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              handlePublishClick();
                              setShowActionsDropdown(false);
                            }}
                            disabled={hasChanges || !hasPendingPublish}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                            title={
                              hasChanges 
                                ? "Save changes before publishing" 
                                : !hasPendingPublish 
                                  ? "No changes to publish" 
                                  : "Publish to Git"
                            }
                          >
                            <Upload className="h-4 w-4" />
                            <span>Publish</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'settings' ? (
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <Settings 
              onClose={() => setViewMode('table')} 
              onLogout={handleLogout}
              directoryName={dirHandle?.name}
            />
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Header with toggle button */}
          <div className="p-3 sm:p-4 border-b">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFileTreeVisible(!isFileTreeVisible)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
                title={isFileTreeVisible ? 'Hide file tree' : 'Show file tree'}
              >
                {isFileTreeVisible ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </button>
              <div className="h-4 w-px bg-border" />
              <h2 className="font-semibold text-base sm:text-lg">
                {selectedFolderPath ? selectedFolderPath : 'All Posts'}
              </h2>
              <span className="text-xs sm:text-sm text-muted-foreground">
                ({(() => {
                  const filteredPosts = allPosts.filter(post => {
                    if (!dirHandle) return true;
                    const hiddenFiles = getHiddenFiles(dirHandle.name);
                    if (hiddenFiles.includes(post.path)) return false;
                    if (selectedFolderPath && !post.path.startsWith(selectedFolderPath + '/')) return false;
                    return true;
                  });
                  return `${filteredPosts.length} ${filteredPosts.length === 1 ? 'post' : 'posts'}`;
                })()})
              </span>
              {selectedFolderPath && (
                <button
                  onClick={() => setSelectedFolderPath(null)}
                  className="text-sm text-primary hover:underline px-3 py-1.5"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
          
          {/* Two-column layout */}
          <div className="flex-1 overflow-hidden flex">
            {/* File Tree Sidebar */}
            {isFileTreeVisible && (
              <div className="relative border-r overflow-y-auto overflow-x-hidden p-3 hidden sm:block" style={{ width: `${fileTreeWidth}px` }}>
                <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                  Folders
                </div>
                <button
                  onClick={() => setSelectedFolderPath(null)}
                  className={`w-full text-left px-4 py-2 rounded-md text-sm transition-colors mb-1 ${
                    !selectedFolderPath ? 'bg-accent font-medium' : 'hover:bg-accent/50'
                  }`}
                >
                  All Posts
                </button>
                <FileBrowser
                  files={fileTree}
                  selectedFile={selectedFolderPath}
                  onFileSelect={(path) => {
                    // Check if this is a directory or file
                    const findItem = (items: FileTreeItem[], targetPath: string): FileTreeItem | null => {
                      for (const item of items) {
                        if (item.path === targetPath) return item;
                        if (item.children) {
                          const found = findItem(item.children, targetPath);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    const item = findItem(fileTree, path);
                    if (item?.isDirectory) {
                      // If directory, filter posts
                      setSelectedFolderPath(path);
                    } else {
                      // If file, find the post and open it for editing
                      const post = allPosts.find(p => p.path === path);
                      if (post) {
                        handleEditPost(post);
                      }
                    }
                  }}
                />
                {/* Resize Handle */}
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                  }}
                  title="Drag to resize"
                >
                  <div className="absolute inset-y-0 -right-1 w-3" />
                </div>
              </div>
            )}
            
            {/* Main Content - Data Table */}
            <div className="flex-1 overflow-hidden p-3 sm:p-4">
              <DataTable
                posts={allPosts.filter(post => {
                  if (!dirHandle) return true;
                  const hiddenFiles = getHiddenFiles(dirHandle.name);
                  if (hiddenFiles.includes(post.path)) return false;
                  // Filter by selected folder
                  if (selectedFolderPath && !post.path.startsWith(selectedFolderPath + '/')) return false;
                  return true;
                })}
                isLoading={isLoadingPosts}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onHide={handleHidePost}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="min-h-full flex justify-center">
            {currentFile ? (
              <div className="w-full max-w-[720px]">
                <MarkdownEditor
                  content={currentFile.content}
                  onChange={handleContentChange}
                  title={currentFile.frontmatter.title || ''}
                  onTitleChange={handleTitleChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground w-full">
                <div className="text-center space-y-2">
                  <p>No file selected</p>
                  <button
                    onClick={() => setViewMode('table')}
                    className="text-sm text-primary hover:underline px-4 py-2"
                  >
                    Go to Table View to select a post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar Sheet */}
      {viewMode === 'editor' && (
        <Sheet
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          side="right"
        >
          <SidebarTabs
            currentFile={currentFile}
            allPosts={allPosts}
            onMetaChange={handleMetaChange}
            onPostClick={(post) => {
              handleEditPost(post);
              setIsMobileSidebarOpen(false);
            }}
          />
        </Sheet>
      )}

      {/* Raw Markdown Modal */}
      {currentFile && (
        <RawMarkdownModal
          isOpen={showRawModal}
          onClose={() => setShowRawModal(false)}
          content={stringifyMarkdown(currentFile)}
          originalContent={currentFile.rawContent}
          filename={currentFile.path}
        />
      )}

      {/* New Post Modal */}
      <NewPostModal
        isOpen={showNewPostModal}
        onClose={() => setShowNewPostModal(false)}
        onCreate={handleCreatePost}
      />

      {/* Publish Modal */}
      {currentFile && selectedFilePath && (
        <PublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onPublish={handlePublish}
          fileName={selectedFilePath}
          gitStatus={gitStatus}
          defaultMessage={generateCommitMessage(currentFile.name, 'update')}
          projectPath={dirHandle?.name}
        />
      )}
    </div>
    </>
  );
}

export default App;
