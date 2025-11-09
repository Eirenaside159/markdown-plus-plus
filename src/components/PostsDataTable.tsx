import { useState, useMemo, useEffect, useRef } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Eye, EyeOff, Trash2, ExternalLink, Loader2, PanelLeft, PanelLeftClose } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { MarkdownFile } from '@/types';
import { formatFieldLabel, isDateString, formatDateValue } from '@/lib/fieldUtils';
import { buildPostUrl } from '@/lib/utils';
import { getSettings } from '@/lib/settings';
import { loadColumnVisibility, saveColumnVisibility } from '@/lib/columnVisibility';
import { ColumnSelector } from '@/components/ColumnSelector';

interface PostsDataTableProps {
  posts: MarkdownFile[];
  isLoading?: boolean;
  onEdit: (post: MarkdownFile) => void;
  onDelete: (post: MarkdownFile) => void;
  onHide: (post: MarkdownFile) => void;
  title?: string;
  onClearFilter?: () => void;
  onToggleSidebar?: () => void;
  isSidebarVisible?: boolean;
}

// Helper functions
const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  
  if (value instanceof Date) {
    return formatDateValue(value.toISOString());
  }
  
  if (typeof value === 'object') return JSON.stringify(value);
  
  const strValue = String(value);
  
  if (isDateString(strValue)) {
    return formatDateValue(strValue);
  }
  
  return strValue;
};

export function PostsDataTable({ posts, isLoading = false, onEdit, onDelete, onHide, title = 'All Posts', onClearFilter, onToggleSidebar, isSidebarVisible }: PostsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => loadColumnVisibility());
  const [globalFilter, setGlobalFilter] = useState('');
  const [visibilityKey, setVisibilityKey] = useState(0);
  const [contextMenuRow, setContextMenuRow] = useState<MarkdownFile | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const settings = getSettings();

  // Adjust context menu position to keep it within viewport
  useEffect(() => {
    if (!contextMenuPosition || !menuRef.current) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = contextMenuPosition.x;
    let adjustedY = contextMenuPosition.y;

    // Adjust horizontal position
    if (contextMenuPosition.x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (contextMenuPosition.y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 10;
    }

    if (adjustedX !== contextMenuPosition.x || adjustedY !== contextMenuPosition.y) {
      setContextMenuPosition({ x: adjustedX, y: adjustedY });
    }
  }, [contextMenuPosition]);

  // Close context menu on ESC key
  useEffect(() => {
    if (!contextMenuRow) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenuRow(null);
        setContextMenuPosition(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [contextMenuRow]);

  // Save column visibility whenever it changes
  useEffect(() => {
    saveColumnVisibility(columnVisibility);
  }, [columnVisibility]);

  // Extract all unique columns from posts
  const allColumns = useMemo(() => {
    const keys = new Set<string>();
    const standardColumns = ['title', 'date', 'author', 'categories', 'tags', 'description'];
    
    posts.forEach(post => {
      Object.keys(post.frontmatter).forEach(key => {
        const value = post.frontmatter[key];
        if (value !== null && value !== undefined && value !== '' &&
            !(Array.isArray(value) && value.length === 0)) {
          keys.add(key);
        }
      });
    });

    const columnsArray = Array.from(keys);
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

  // Define columns
  const columns = useMemo<ColumnDef<MarkdownFile>[]>(() => {
    return allColumns.map(columnKey => {
      // Special handling for title column
      if (columnKey === 'title') {
        return {
          accessorKey: 'frontmatter.title',
          id: columnKey,
          enableHiding: false, // Title column cannot be hidden
          header: ({ column }) => {
            return (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                className="justify-start px-0 hover:bg-transparent"
              >
                {formatFieldLabel(columnKey)}
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            );
          },
          cell: ({ row }) => {
            const value = row.original.frontmatter[columnKey];
            const postUrl = buildPostUrl(settings.baseUrl, settings.urlFormat, row.original.frontmatter);
            
            return (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(row.original)}
                  className="font-medium hover:underline text-left flex-1 min-w-0 truncate"
                >
                  {formatCellValue(value) || <span className="text-muted-foreground">Untitled</span>}
                </button>
                {postUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    asChild
                  >
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Open: ${postUrl}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(row.original)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onHide(row.original)}>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Hide
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(row.original)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        };
      }

      // Other columns
      return {
        accessorFn: (row) => row.frontmatter[columnKey],
        id: columnKey,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="justify-start px-0 hover:bg-transparent"
            >
              {formatFieldLabel(columnKey)}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const value = row.original.frontmatter[columnKey];
          return (
            <div className="text-muted-foreground truncate">
              {formatCellValue(value) || '—'}
            </div>
          );
        },
      };
    });
  }, [allColumns, settings, onEdit, onHide, onDelete]);

  const table = useReactTable({
    data: posts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {onToggleSidebar && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 touch-target"
                title={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
              >
                {isSidebarVisible ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <div className="h-4 w-px bg-border hidden sm:block" />
            </>
          )}
          <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            ({table.getFilteredRowModel().rows.length} {table.getFilteredRowModel().rows.length === 1 ? 'post' : 'posts'})
          </span>
          {onClearFilter && title !== 'All Posts' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilter}
              className="h-7 sm:h-8 text-xs sm:text-sm text-primary hover:text-primary hover:underline touch-target"
            >
              Clear filter
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Input
          placeholder="Search all columns..."
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="w-full sm:max-w-xs text-sm"
        />
        <ColumnSelector 
          key={visibilityKey}
          table={table}
          onVisibilityChange={() => setVisibilityKey(k => k + 1)}
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-xs sm:text-sm">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={contextMenuRow?.path === row.original.path ? 'bg-accent/50' : ''}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuRow(row.original);
                    setContextMenuPosition({ x: e.clientX, y: e.clientY });
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-xs sm:text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {globalFilter ? 'No posts match your search.' : 'No posts found.'}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 py-3 sm:py-4">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-medium whitespace-nowrap">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-8 w-16 sm:w-[70px] rounded-md border border-input bg-background text-xs sm:text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none bg-[length:16px_16px] bg-[position:right_0.25rem_center] bg-no-repeat px-2 pr-6"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
              }}
            >
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap justify-center">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 touch-target"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              >
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 touch-target"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Button>
            
            {/* Page Numbers */}
            {(() => {
              const currentPage = table.getState().pagination.pageIndex;
              const pageCount = table.getPageCount();
              const pages: (number | string)[] = [];
              
              if (pageCount <= 7) {
                // Show all pages if 7 or less
                for (let i = 0; i < pageCount; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(0);
                
                if (currentPage <= 3) {
                  // Near start
                  pages.push(1, 2, 3, 4, '...', pageCount - 1);
                } else if (currentPage >= pageCount - 4) {
                  // Near end
                  pages.push('...', pageCount - 5, pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1);
                } else {
                  // Middle
                  pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', pageCount - 1);
                }
              }
              
              return pages.map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 sm:px-2 text-xs sm:text-sm text-muted-foreground">
                      ...
                    </span>
                  );
                }
                
                const pageNum = page as number;
                const isActive = pageNum === currentPage;
                
                return (
                  <Button
                    key={pageNum}
                    variant={isActive ? 'default' : 'outline'}
                    className="h-8 w-8 p-0 text-xs sm:text-sm touch-target"
                    onClick={() => table.setPageIndex(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              });
            })()}
            
            <Button
              variant="outline"
              className="h-8 w-8 p-0 touch-target"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 touch-target"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
              >
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenuRow && contextMenuPosition && (
        <>
          <div 
            className="fixed inset-0 z-50" 
            onClick={() => {
              setContextMenuRow(null);
              setContextMenuPosition(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuRow(null);
              setContextMenuPosition(null);
            }}
          />
          <div
            ref={menuRef}
            className="fixed z-50 min-w-[12rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            style={{
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`,
            }}
          >
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              Actions
            </div>
            <button
              onClick={() => {
                onEdit(contextMenuRow);
                setContextMenuRow(null);
                setContextMenuPosition(null);
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <Eye className="mr-2 h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => {
                onHide(contextMenuRow);
                setContextMenuRow(null);
                setContextMenuPosition(null);
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Hide
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => {
                onDelete(contextMenuRow);
                setContextMenuRow(null);
                setContextMenuPosition(null);
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

