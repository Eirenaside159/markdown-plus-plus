import { useState, useMemo } from 'react';
import { Settings2, Search, CheckSquare, Square } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import type { MarkdownFile } from '@/types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { formatFieldLabel } from '@/lib/fieldUtils';
import { saveColumnVisibility } from '@/lib/columnVisibility';

interface ColumnSelectorProps {
  table: Table<MarkdownFile>;
  onVisibilityChange?: () => void;
}

export function ColumnSelector({ table, onVisibilityChange }: ColumnSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const columns = useMemo(() => {
    return table
      .getAllColumns()
      .filter((column) => column.getCanHide())
      .map((column) => ({
        id: column.id,
        label: formatFieldLabel(column.id),
        isVisible: column.getIsVisible(),
        toggle: (value: boolean) => column.toggleVisibility(value),
      }));
  }, [table, isOpen]); // Re-compute when dropdown opens

  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;
    const query = searchQuery.toLowerCase();
    return columns.filter((col) => 
      col.label.toLowerCase().includes(query) || 
      col.id.toLowerCase().includes(query)
    );
  }, [columns, searchQuery]);

  const visibleCount = columns.filter((col) => col.isVisible).length;
  const standardColumns = ['title', 'date', 'author', 'categories', 'tags', 'description'];

  const { standard, custom } = useMemo(() => {
    const standard = filteredColumns.filter((col) => standardColumns.includes(col.id));
    const custom = filteredColumns.filter((col) => !standardColumns.includes(col.id));
    return { standard, custom };
  }, [filteredColumns]);

  const handleSelectAll = () => {
    filteredColumns.forEach((col) => col.toggle(true));
    saveColumnVisibility(table.getState().columnVisibility);
    onVisibilityChange?.();
  };

  const handleDeselectAll = () => {
    filteredColumns.forEach((col) => col.toggle(false));
    saveColumnVisibility(table.getState().columnVisibility);
    onVisibilityChange?.();
  };

  const handleToggle = (col: typeof columns[0], value: boolean) => {
    col.toggle(value);
    saveColumnVisibility(table.getState().columnVisibility);
    onVisibilityChange?.();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Columns
          <span className="text-xs text-muted-foreground">
            ({visibleCount}/{columns.length})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[320px] p-0">
        {/* Header with search */}
        <div className="p-3 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1 h-8 text-xs"
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="flex-1 h-8 text-xs"
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Deselect All
            </Button>
          </div>
        </div>

        {/* Column list */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {standard.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Standard Fields
              </div>
              <div className="space-y-1">
                {standard.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={col.isVisible}
                      onChange={(e) => handleToggle(col, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-sm flex-1">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {custom.length > 0 && (
            <div>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Custom Fields
              </div>
              <div className="space-y-1">
                {custom.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={col.isVisible}
                      onChange={(e) => handleToggle(col, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-sm flex-1">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {filteredColumns.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No columns found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

