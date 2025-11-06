import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowUp, ArrowDown, Edit, Trash2, Filter, Loader2, EyeOff, MoreVertical } from 'lucide-react';
import type { MarkdownFile } from '@/types';
import { formatFieldLabel, isDateString, formatDateValue, normalizeDateValue } from '@/lib/fieldUtils';
import { ColumnSettings } from './ColumnSettings';

interface DataTableProps {
  posts: MarkdownFile[];
  isLoading?: boolean;
  onEdit: (post: MarkdownFile) => void;
  onDelete: (post: MarkdownFile) => void;
  onHide: (post: MarkdownFile) => void;
}

const STORAGE_KEY = 'mdplusplus-visible-columns';

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

export function DataTable({ posts, isLoading = false, onEdit, onDelete, onHide }: DataTableProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortState, setSortState] = useState<SortState>({ column: 'date', direction: 'desc' });
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Extract all unique metadata keys from all posts
  const columns = useMemo(() => {
    const allKeys = new Set<string>();
    
    // Standard columns to show first
    const standardColumns = ['title', 'date', 'author', 'categories', 'tags', 'description'];
    
    posts.forEach(post => {
      Object.keys(post.frontmatter).forEach(key => {
        if (post.frontmatter[key] !== null && 
            post.frontmatter[key] !== undefined && 
            post.frontmatter[key] !== '' &&
            !(Array.isArray(post.frontmatter[key]) && post.frontmatter[key].length === 0)) {
          allKeys.add(key);
        }
      });
    });

    // Sort columns: standard first, then alphabetically
    const columnsArray = Array.from(allKeys);
    columnsArray.sort((a, b) => {
      const aIndex = standardColumns.indexOf(a);
      const bIndex = standardColumns.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.localeCompare(b);
    });

    return columnsArray;
  }, [posts]);

  // Initialize visible columns from localStorage or default to all columns
  useEffect(() => {
    if (columns.length > 0 && visibleColumns.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate that saved columns still exist
          const validColumns = parsed.filter((col: string) => columns.includes(col));
          if (validColumns.length > 0) {
            setVisibleColumns(validColumns);
            return;
          }
        }
      } catch (error) {
        // Use defaults on error
      }
      // Default: show all columns
      setVisibleColumns(columns);
    }
  }, [columns, visibleColumns.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside all dropdowns
      if (!target.closest('[data-dropdown-menu]') && !target.closest('[data-dropdown-trigger]')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Save visible columns to localStorage
  const handleVisibilityChange = (newVisibleColumns: string[]) => {
    setVisibleColumns(newVisibleColumns);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVisibleColumns));
    } catch (error) {
      // Silently handle error
    }
  };

  // Filter columns based on visibility
  const displayColumns = useMemo(() => {
    return columns.filter(col => visibleColumns.includes(col));
  }, [columns, visibleColumns]);

  // Format cell value for display
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    
    // Handle Date objects (gray-matter parses dates as Date objects)
    if (value instanceof Date) {
      return formatDateValue(value.toISOString());
    }
    
    // Handle other objects
    if (typeof value === 'object') return JSON.stringify(value);
    
    const strValue = String(value);
    
    // Auto-detect and format date strings
    if (isDateString(strValue)) {
      return formatDateValue(strValue);
    }
    
    return strValue;
  };

  // Get raw value for sorting (used in sort function)
  const getRawValueForSort = (post: MarkdownFile, column: string): string => {
    const value = post.frontmatter[column];
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(' ').toLowerCase();
    
    // Handle Date objects - use ISO format for proper sorting
    if (value instanceof Date) {
      return value.toISOString().toLowerCase();
    }
    
    const strValue = String(value);
    // Normalize dates to ISO format for proper sorting
    if (isDateString(strValue)) {
      return normalizeDateValue(strValue).toLowerCase();
    }
    
    return strValue.toLowerCase();
  };

  // Get raw value for filtering (includes formatted dates for user-friendly search)
  const getRawValueForFilter = (post: MarkdownFile, column: string): string => {
    const value = post.frontmatter[column];
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(' ').toLowerCase();
    
    // Handle Date objects - include BOTH ISO and formatted versions for filtering
    if (value instanceof Date) {
      const iso = value.toISOString();
      const formatted = formatDateValue(iso);
      return `${iso} ${formatted}`.toLowerCase();
    }
    
    const strValue = String(value);
    // For date strings, include BOTH ISO and formatted versions
    if (isDateString(strValue)) {
      const iso = normalizeDateValue(strValue);
      const formatted = formatDateValue(strValue);
      return `${iso} ${formatted}`.toLowerCase();
    }
    
    return strValue.toLowerCase();
  };

  // Filter posts
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Global filter
    if (globalFilter) {
      const searchTerm = globalFilter.toLowerCase();
      filtered = filtered.filter(post => {
        // Search in all metadata fields
        return columns.some(column => {
          const value = getRawValueForFilter(post, column);
          return value.includes(searchTerm);
        });
      });
    }

    // Column filters
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue) {
        const searchTerm = filterValue.toLowerCase();
        filtered = filtered.filter(post => {
          const value = getRawValueForFilter(post, column);
          return value.includes(searchTerm);
        });
      }
    });

    return filtered;
  }, [posts, globalFilter, columnFilters, columns]);

  // Sort posts
  const sortedPosts = useMemo(() => {
    if (!sortState.column || !sortState.direction) return filteredPosts;

    return [...filteredPosts].sort((a, b) => {
      const aVal = a.frontmatter[sortState.column!];
      const bVal = b.frontmatter[sortState.column!];

      // Handle null/undefined
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      // Handle Date objects - use timestamp for numeric comparison
      if (aVal instanceof Date && bVal instanceof Date) {
        const comparison = aVal.getTime() - bVal.getTime();
        return sortState.direction === 'asc' ? comparison : -comparison;
      }
      if (aVal instanceof Date) {
        const bTime = isDateString(String(bVal)) ? new Date(String(bVal)).getTime() : 0;
        const comparison = aVal.getTime() - bTime;
        return sortState.direction === 'asc' ? comparison : -comparison;
      }
      if (bVal instanceof Date) {
        const aTime = isDateString(String(aVal)) ? new Date(String(aVal)).getTime() : 0;
        const comparison = aTime - bVal.getTime();
        return sortState.direction === 'asc' ? comparison : -comparison;
      }

      // Handle date strings - convert to timestamp for proper sorting
      const aStr = String(aVal);
      const bStr = String(bVal);
      
      if (isDateString(aStr) && isDateString(bStr)) {
        const aTime = new Date(aStr).getTime();
        const bTime = new Date(bStr).getTime();
        const comparison = aTime - bTime;
        return sortState.direction === 'asc' ? comparison : -comparison;
      }
      
      // Fallback to string comparison for non-dates
      const aValue = getRawValueForSort(a, sortState.column!);
      const bValue = getRawValueForSort(b, sortState.column!);

      if (aValue === bValue) return 0;
      
      const comparison = aValue > bValue ? 1 : -1;
      return sortState.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredPosts, sortState]);

  // Handle sort
  const handleSort = (column: string) => {
    setSortState(prev => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { column: null, direction: null };
      }
      return { column, direction: 'asc' };
    });
  };

  // Handle column filter
  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value,
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setGlobalFilter('');
    setColumnFilters({});
    setSortState({ column: 'date', direction: 'desc' });
  };

  const hasActiveFilters = globalFilter || Object.values(columnFilters).some(v => v);

  return (
    <div className="flex flex-col h-full">
      {/* Search and Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 pl-10 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowColumnFilters(!showColumnFilters)}
          className={`inline-flex items-center justify-center h-9 w-9 rounded-md border transition-colors ${
            showColumnFilters || Object.values(columnFilters).some(v => v)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background hover:bg-accent'
          }`}
          title="Toggle column filters"
        >
          <Filter className="h-4 w-4" />
        </button>
        <div className="hidden sm:block">
          <ColumnSettings
            columns={columns}
            visibleColumns={visibleColumns}
            onVisibilityChange={handleVisibilityChange}
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors"
          >
            Clear
          </button>
        )}
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {sortedPosts.length}/{posts.length}
        </div>
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block flex-1 overflow-auto border rounded-md">
        <table className="w-full text-base">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              {displayColumns.map(column => (
                <th key={column} className="text-left px-4 py-1.5 border-b">
                  <div className="space-y-2">
                    {/* Column Header with Sort */}
                    <button
                      onClick={() => handleSort(column)}
                      className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors w-full"
                    >
                      <span className="truncate">{formatFieldLabel(column)}</span>
                      {sortState.column === column && (
                        sortState.direction === 'asc' ? (
                          <ArrowUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ArrowDown className="h-4 w-4 shrink-0" />
                        )
                      )}
                    </button>
                    
                    {/* Column Filter (collapsible) */}
                    {showColumnFilters && (
                      <input
                        type="text"
                        value={columnFilters[column] || ''}
                        onChange={(e) => handleColumnFilter(column, e.target.value)}
                        placeholder="Filter..."
                        className="w-full px-2 py-1 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={displayColumns.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-base text-muted-foreground">Loading posts...</p>
                  </div>
                </td>
              </tr>
            ) : sortedPosts.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length} className="text-center py-16 text-base text-muted-foreground">
                  No posts found
                </td>
              </tr>
            ) : (
              sortedPosts.map((post, index) => (
                <tr 
                  key={post.path + index}
                  className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                >
                  {displayColumns.map(column => (
                    <td key={column} className="px-4 py-3 max-w-xs">
                      {column === 'title' ? (
                        <div className="flex items-center gap-2 group">
                          <button
                            onClick={() => onEdit(post)}
                            className="truncate text-sm text-left flex-1 hover:text-primary hover:underline transition-colors font-medium"
                            title={formatCellValue(post.frontmatter[column])}
                          >
                            {formatCellValue(post.frontmatter[column]) || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </button>
                          <div className="relative">
                            <button
                              data-dropdown-trigger
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === post.path ? null : post.path);
                              }}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                              title="More actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {openDropdown === post.path && (
                              <div 
                                data-dropdown-menu
                                className="absolute right-0 top-8 z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                              >
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  Actions
                                </div>
                                <button
                                  onClick={() => {
                                    onHide(post);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                                >
                                  <EyeOff className="h-4 w-4" />
                                  <span>Hide</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onDelete(post);
                                    setOpenDropdown(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive hover:text-white transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="truncate text-sm" title={formatCellValue(post.frontmatter[column])}>
                          {formatCellValue(post.frontmatter[column]) || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden flex-1 overflow-auto space-y-3">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-base text-muted-foreground">Loading posts...</p>
            </div>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="text-center py-16 text-base text-muted-foreground">
            No posts found
          </div>
        ) : (
          sortedPosts.map((post, index) => (
            <div
              key={post.path + index}
              className="border rounded-lg bg-card p-4 space-y-3 active:bg-accent/50 transition-colors"
            >
              {/* Title */}
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => onEdit(post)}
                  className="flex-1 text-left"
                >
                  <h3 className="font-semibold text-base line-clamp-2 hover:text-primary transition-colors">
                    {post.frontmatter.title || post.name}
                  </h3>
                </button>
                <div className="relative shrink-0">
                  <button
                    data-dropdown-trigger
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === post.path ? null : post.path);
                    }}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
                    title="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openDropdown === post.path && (
                    <div 
                      data-dropdown-menu
                      className="absolute right-0 top-10 z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                    >
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Edit
                      </div>
                      <button
                        onClick={() => {
                          onHide(post);
                          setOpenDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      >
                        <EyeOff className="h-4 w-4" />
                        <span>Hide</span>
                      </button>
                      <button
                        onClick={() => {
                          onDelete(post);
                          setOpenDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive hover:text-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-1.5 text-sm">
                {displayColumns.slice(0, 5).map(column => {
                  if (column === 'title') return null;
                  const value = formatCellValue(post.frontmatter[column]);
                  if (!value) return null;
                  
                  return (
                    <div key={column} className="flex gap-2">
                      <span className="text-muted-foreground min-w-[80px] shrink-0">
                        {formatFieldLabel(column)}:
                      </span>
                      <span className="truncate">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

