import { useState, useEffect, useRef } from 'react';
import { Columns, X } from 'lucide-react';
import { formatFieldLabel } from '@/lib/fieldUtils';

interface ColumnSettingsProps {
  columns: string[];
  visibleColumns: string[];
  onVisibilityChange: (columns: string[]) => void;
}

export function ColumnSettings({ columns, visibleColumns, onVisibilityChange }: ColumnSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleColumn = (column: string) => {
    if (visibleColumns.includes(column)) {
      // Don't allow removing the last column
      if (visibleColumns.length > 1) {
        onVisibilityChange(visibleColumns.filter(c => c !== column));
      }
    } else {
      onVisibilityChange([...visibleColumns, column]);
    }
  };

  const selectAll = () => {
    onVisibilityChange(columns);
  };

  const selectNone = () => {
    // Keep at least one column (title if available, otherwise first column)
    const defaultColumn = columns.includes('title') ? 'title' : columns[0];
    onVisibilityChange([defaultColumn]);
  };

  const visibleCount = visibleColumns.length;
  const totalCount = columns.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-2 rounded-md border border-input bg-background hover:bg-accent transition-colors"
        title="Column Settings"
      >
        <Columns className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-popover border border-border rounded-md shadow-lg z-20">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div>
              <h3 className="text-sm font-medium">Column Visibility</h3>
              <p className="text-xs text-muted-foreground">
                {visibleCount} of {totalCount} visible
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center p-1 rounded hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 p-2 border-b">
            <button
              onClick={selectAll}
              className="flex-1 px-2 py-1 text-xs rounded border border-input hover:bg-accent transition-colors"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="flex-1 px-2 py-1 text-xs rounded border border-input hover:bg-accent transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Column List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {columns.map(column => {
              const isVisible = visibleColumns.includes(column);
              const isLastVisible = isVisible && visibleColumns.length === 1;
              
              return (
                <label
                  key={column}
                  className={`flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors cursor-pointer ${
                    isLastVisible ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleColumn(column)}
                    disabled={isLastVisible}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm flex-1">
                    {formatFieldLabel(column)}
                  </span>
                  {column === 'title' && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              At least one column must be visible
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

