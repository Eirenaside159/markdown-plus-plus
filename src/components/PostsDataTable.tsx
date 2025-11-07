import { useState, useMemo } from 'react';
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
import { ArrowUpDown, MoreHorizontal, Settings2, Eye, EyeOff, Trash2, ExternalLink, Loader2, PanelLeft, PanelLeftClose } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const settings = getSettings();

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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="h-9 w-9"
                title={isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
              >
                {isSidebarVisible ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <div className="h-4 w-px bg-border" />
            </>
          )}
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">
            ({table.getFilteredRowModel().rows.length} {table.getFilteredRowModel().rows.length === 1 ? 'post' : 'posts'})
          </span>
          {onClearFilter && title !== 'All Posts' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilter}
              className="h-8 text-primary hover:text-primary hover:underline"
            >
              Clear filter
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search all columns..."
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-xs"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Columns <Settings2 className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {formatFieldLabel(column.id)}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  <div className="text-sm text-muted-foreground">
                    {globalFilter ? 'No posts match your search.' : 'No posts found.'}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

