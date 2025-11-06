import type { FileTreeItem } from '@/types';
import { File, Folder, FolderOpen, ChevronRight, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FileBrowserProps {
  files: FileTreeItem[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  hiddenFiles: string[];
  onFileMove?: (sourcePath: string, targetDirPath: string) => void;
  isMoving?: boolean;
}

function FileTreeNode({
  item,
  level,
  selectedFile,
  onFileSelect,
  hiddenFiles,
  onFileMove,
  isMoving,
}: {
  item: FileTreeItem;
  level: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  hiddenFiles: string[];
  onFileMove?: (sourcePath: string, targetDirPath: string) => void;
  isMoving?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const isHidden = hiddenFiles.includes(item.path);

  if (item.isDirectory) {
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
                isOpen && 'rotate-90'
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
              selectedFile === item.path && 'bg-accent font-medium',
              isHidden && 'opacity-50',
              isDragOver && 'bg-primary/20 border-2 border-primary border-dashed'
            )}
          >
            {isOpen ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{item.name}</span>
            {isHidden && <EyeOff className="h-3 w-3 shrink-0 ml-auto" />}
          </button>
        </div>
        {isOpen && item.children && (
          <div>
            {item.children.map((child) => (
              <FileTreeNode
                key={child.path}
                item={child}
                level={level + 1}
                selectedFile={selectedFile}
                onFileSelect={onFileSelect}
                hiddenFiles={hiddenFiles}
                onFileMove={onFileMove}
                isMoving={isMoving}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const [isDragging, setIsDragging] = useState(false);

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
    <button
      onClick={() => onFileSelect(item.path)}
      draggable={!isMoving}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'flex w-full items-center gap-2 rounded-md py-1.5 text-sm hover:bg-accent min-w-0 transition-opacity',
        selectedFile === item.path && 'bg-accent',
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
  );
}

export function FileBrowser({ files, selectedFile, onFileSelect, hiddenFiles, onFileMove, isMoving }: FileBrowserProps) {
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
        />
      ))}
    </div>
  );
}
