import { useState, useEffect } from 'react';
import { FileBrowser } from '@/components/FileBrowser';
import { MetadataEditor } from '@/components/MetadataEditor';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { PostTable } from '@/components/PostTable';
import { selectDirectory, readDirectory, readFile, writeFile, deleteFile } from '@/lib/fileSystem';
import { parseMarkdown, stringifyMarkdown, updateFrontmatter } from '@/lib/markdown';
import type { FileTreeItem, MarkdownFile } from '@/types';
import { FolderOpen, Save, Table, FileEdit, RefreshCw } from 'lucide-react';

type ViewMode = 'table' | 'editor';

function App() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<FileTreeItem[]>([]);
  const [allPosts, setAllPosts] = useState<MarkdownFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<MarkdownFile | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isLoading, setIsLoading] = useState(false);

  const loadAllPosts = async (handle: FileSystemDirectoryHandle, fileTree: FileTreeItem[]) => {
    setIsLoading(true);
    try {
      const posts: MarkdownFile[] = [];
      
      const loadFile = async (item: FileTreeItem) => {
        if (!item.isDirectory) {
          try {
            const content = await readFile(handle, item.path);
            const parsed = parseMarkdown(content, item.path, item.name);
            posts.push(parsed);
          } catch (error) {
            console.error(`Error loading ${item.path}:`, error);
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

      setAllPosts(posts);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDirectory = async () => {
    const handle = await selectDirectory();
    if (handle) {
      setDirHandle(handle);
      const fileTree = await readDirectory(handle);
      setFiles(fileTree);
      await loadAllPosts(handle, fileTree);
    }
  };

  const handleRefresh = async () => {
    if (dirHandle) {
      const fileTree = await readDirectory(dirHandle);
      setFiles(fileTree);
      await loadAllPosts(dirHandle, fileTree);
    }
  };

  const handleFileSelect = async (path: string) => {
    if (!dirHandle) return;
    
    // Check if we need to save current changes
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }

    const content = await readFile(dirHandle, path);
    const parsed = parseMarkdown(content, path, path.split('/').pop() || '');
    setCurrentFile(parsed);
    setSelectedFilePath(path);
    setHasChanges(false);
    setViewMode('editor');
  };

  const handleEditPost = (post: MarkdownFile) => {
    if (hasChanges && !window.confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setCurrentFile(post);
    setSelectedFilePath(post.path);
    setHasChanges(false);
    setViewMode('editor');
  };

  const handleDeletePost = async (post: MarkdownFile) => {
    if (!dirHandle) return;
    
    const confirmMsg = `Are you sure you want to delete "${post.frontmatter.title || post.name}"?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await deleteFile(dirHandle, post.path);
      
      // Refresh file tree and posts
      const fileTree = await readDirectory(dirHandle);
      setFiles(fileTree);
      await loadAllPosts(dirHandle, fileTree);
      
      // Clear current file if it was deleted
      if (currentFile?.path === post.path) {
        setCurrentFile(null);
        setSelectedFilePath(null);
        setHasChanges(false);
      }
      
      console.log(`Deleted: ${post.path}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!dirHandle || !currentFile || !selectedFilePath) return;
    
    try {
      const content = stringifyMarkdown(currentFile);
      await writeFile(dirHandle, selectedFilePath, content);
      setHasChanges(false);
      
      // Update the post in allPosts
      const updatedPosts = allPosts.map(post => 
        post.path === currentFile.path ? currentFile : post
      );
      setAllPosts(updatedPosts);
      
      console.log('File saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file. Please try again.');
    }
  };

  const handleContentChange = (content: string) => {
    if (currentFile) {
      setCurrentFile({ ...currentFile, content });
      setHasChanges(true);
    }
  };

  const handleMetadataChange = (frontmatter: MarkdownFile['frontmatter']) => {
    if (currentFile) {
      const updated = updateFrontmatter(currentFile, frontmatter);
      setCurrentFile(updated);
      setHasChanges(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, currentFile, selectedFilePath]);

  if (!dirHandle) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-bold">Markdown Editor</h1>
          <p className="text-muted-foreground">
            Select a folder to start editing markdown files
          </p>
          <button
            onClick={handleSelectDirectory}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <FolderOpen className="h-5 w-5" />
            Select Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="flex h-14 items-center px-4 gap-4">
          <h2 className="font-semibold">
            {viewMode === 'table' ? 'All Posts' : currentFile ? currentFile.name : 'Markdown Editor'}
          </h2>
          {hasChanges && viewMode === 'editor' && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md border border-input bg-background">
              <button
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  viewMode === 'table'
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <Table className="h-4 w-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('editor')}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm transition-colors border-l ${
                  viewMode === 'editor'
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <FileEdit className="h-4 w-4" />
                Editor
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleSelectDirectory}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              title="Change Folder"
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            {viewMode === 'editor' && (
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'table' ? (
        <div className="flex-1 overflow-hidden p-4">
          <PostTable
            posts={allPosts}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: File Browser */}
          <div className="w-64 border-r flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-medium text-sm">Files</h3>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <FileBrowser
                files={files}
                selectedFile={selectedFilePath}
                onFileSelect={handleFileSelect}
              />
            </div>
          </div>

          {/* Center: Editor */}
          <div className="flex-1 p-4 overflow-auto">
            {currentFile ? (
              <MarkdownEditor
                content={currentFile.content}
                onChange={handleContentChange}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Select a file to edit
              </div>
            )}
          </div>

          {/* Right: Metadata */}
          <div className="w-80 border-l flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-medium text-sm">Metadata</h3>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {currentFile ? (
                <MetadataEditor
                  frontmatter={currentFile.frontmatter}
                  onChange={handleMetadataChange}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No file selected
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
