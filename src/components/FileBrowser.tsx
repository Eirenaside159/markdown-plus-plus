import type { FileTreeItem } from '@/types';
import { File, Folder, FolderOpen, ChevronRight, EyeOff, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

interface FileBrowserProps {
  files: FileTreeItem[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  hiddenFiles: string[];
  onFileMove?: (sourcePath: string, targetDirPath: string) => void;
  isMoving?: boolean;
  onFileEdit?: (path: string) => void;
  onFileHide?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  searchQuery?: string;
  isLoading?: boolean;
}

function FileTreeNode({
  item,
  level,
  selectedFile,
  onFileSelect,
  hiddenFiles,
  onFileMove,
  isMoving,
  onFileEdit,
  onFileHide,
  onFileDelete,
  contextMenuPath,
  setContextMenuPath,
  searchQuery,
}: {
  item: FileTreeItem;
  level: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  hiddenFiles: string[];
  onFileMove?: (sourcePath: string, targetDirPath: string) => void;
  isMoving?: boolean;
  onFileEdit?: (path: string) => void;
  onFileHide?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  contextMenuPath: string | null;
  setContextMenuPath: (path: string | null) => void;
  searchQuery?: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isHidden = hiddenFiles.includes(item.path);
  
  // Auto-expand when searching
  const shouldBeOpen = (searchQuery && searchQuery.length > 0) ? true : isOpen;

  // Check if item matches search query
  const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
  
  if (item.isDirectory) {
    // Filter children based on search query
    const filteredChildren = item.children?.filter(child => {
      if (!searchQuery) return true;
      // Recursively check if child or any descendant matches
      const childMatches = child.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (childMatches) return true;
      // Check if any descendant matches
      const hasMatchingDescendant = (item: FileTreeItem): boolean => {
        if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) return true;
        return item.children?.some(hasMatchingDescendant) || false;
      };
      return hasMatchingDescendant(child);
    });
    
    // Don't render if no children match the search
    if (searchQuery && filteredChildren?.length === 0 && !matchesSearch) {
      return null;
    }
    
    const handleDragOver = (e: React.DragEvent) => {
      if (isMoving) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      if (isMoving) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      if (isMoving) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const sourcePath = e.dataTransfer.getData('text/plain');
      if (sourcePath && onFileMove && sourcePath !== item.path) {
        // Don't allow moving into self or child directories
        if (!item.path.startsWith(sourcePath + '/')) {
          onFileMove(sourcePath, item.path);
        }
      }
    };

    return (
      <div>
        <div className="flex w-full items-center min-w-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-center p-1 hover:bg-accent rounded"
            style={{ marginLeft: `${level * 12}px` }}
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                shouldBeOpen && 'rotate-90'
              )}
            />
          </button>
          <button
            onClick={() => onFileSelect(item.path)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'flex flex-1 items-center gap-1 rounded-md py-1.5 px-1 text-sm hover:bg-accent min-w-0',
              selectedFile === item.path && 'bg-accent font-medium text-foreground',
              isHidden && 'opacity-50',
              isDragOver && 'bg-primary/20 border-2 border-primary border-dashed'
            )}
          >
            {shouldBeOpen ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{item.name}</span>
            {isHidden && <EyeOff className="h-3 w-3 shrink-0 ml-auto" />}
          </button>
        </div>
        {shouldBeOpen && filteredChildren && filteredChildren.length > 0 && (
          <div>
            {filteredChildren.map((child) => (
              <FileTreeNode
                key={child.path}
                item={child}
                level={level + 1}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                hiddenFiles={hiddenFiles}
                onFileMove={onFileMove}
                isMoving={isMoving}
                onFileEdit={onFileEdit}
                onFileHide={onFileHide}
                onFileDelete={onFileDelete}
                contextMenuPath={contextMenuPath}
                setContextMenuPath={setContextMenuPath}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Don't render if file doesn't match search
  if (!matchesSearch) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (isMoving) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', item.path);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <ContextMenu
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setContextMenuPath(null);
        }
      }}
      menu={
        <ContextMenuContent>
          <ContextMenuLabel>Actions</ContextMenuLabel>
          <ContextMenuItem onClick={() => {
            onFileEdit?.(item.path);
          }}>
            <Eye className="mr-2 h-4 w-4" />
            Edit
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {
            onFileHide?.(item.path);
          }}>
            <EyeOff className="mr-2 h-4 w-4" />
            Hide
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => {
              onFileDelete?.(item.path);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      }
    >
      <ContextMenuTrigger>
        <button
          onClick={() => onFileSelect(item.path)}
          onContextMenu={() => setContextMenuPath(item.path)}
          draggable={!isMoving}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={cn(
            'flex w-full items-center gap-2 rounded-md py-1.5 text-sm hover:bg-accent min-w-0 transition-opacity',
            selectedFile === item.path && 'bg-accent text-foreground',
            contextMenuPath === item.path && 'bg-accent/50',
            isHidden && 'opacity-50',
            isDragging && 'opacity-30',
            !isMoving && 'cursor-move',
            isMoving && 'cursor-not-allowed opacity-60'
          )}
          style={{ paddingLeft: `${level * 12 + 20}px` }}
        >
          <File className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.name}</span>
          {isHidden && <EyeOff className="h-3 w-3 shrink-0 ml-auto" />}
        </button>
      </ContextMenuTrigger>
    </ContextMenu>
  );
}

export function FileBrowser({ files, selectedFile, onFileSelect, hiddenFiles, onFileMove, isMoving, onFileEdit, onFileHide, onFileDelete, searchQuery, isLoading }: FileBrowserProps) {
  const [contextMenuPath, setContextMenuPath] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading files...
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No markdown files found</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {files.map((item) => (
        <FileTreeNode
          key={item.path}
          item={item}
          level={0}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          hiddenFiles={hiddenFiles}
          onFileMove={onFileMove}
          isMoving={isMoving}
          onFileEdit={onFileEdit}
          onFileHide={onFileHide}
          onFileDelete={onFileDelete}
          contextMenuPath={contextMenuPath}
          setContextMenuPath={setContextMenuPath}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}
