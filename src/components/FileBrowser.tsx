import type { FileTreeItem } from '@/types';
import { File, Folder, FolderOpen, ChevronRight, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FileBrowserProps {
  files: FileTreeItem[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  hiddenFiles: string[];
}

function FileTreeNode({
  item,
  level,
  selectedFile,
  onFileSelect,
  hiddenFiles,
}: {
  item: FileTreeItem;
  level: number;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  hiddenFiles: string[];
}) {
  const [isOpen, setIsOpen] = useState(true);
  const isHidden = hiddenFiles.includes(item.path);

  if (item.isDirectory) {
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
            className={cn(
              'flex flex-1 items-center gap-1 rounded-md py-1.5 px-1 text-sm hover:bg-accent min-w-0',
              selectedFile === item.path && 'bg-accent font-medium',
              isHidden && 'opacity-50'
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
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(item.path)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md py-1.5 text-sm hover:bg-accent min-w-0',
        selectedFile === item.path && 'bg-accent',
        isHidden && 'opacity-50'
      )}
      style={{ paddingLeft: `${level * 12 + 20}px` }}
    >
      <File className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.name}</span>
      {isHidden && <EyeOff className="h-3 w-3 shrink-0 ml-auto" />}
    </button>
  );
}

export function FileBrowser({ files, selectedFile, onFileSelect, hiddenFiles }: FileBrowserProps) {
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
        />
      ))}
    </div>
  );
}
