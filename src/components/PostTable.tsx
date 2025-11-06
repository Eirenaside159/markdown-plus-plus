import type { MarkdownFile } from '@/types';
import { Edit, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { isDateString, formatDateValue } from '@/lib/fieldUtils';
import { buildPostUrl } from '@/lib/utils';
import { getSettings } from '@/lib/settings';

interface PostTableProps {
  posts: MarkdownFile[];
  isLoading?: boolean;
  onEdit: (post: MarkdownFile) => void;
  onDelete: (post: MarkdownFile) => void;
}

export function PostTable({ posts, isLoading = false, onEdit, onDelete }: PostTableProps) {
  // Get settings for URL building
  const settings = getSettings();
  
  // Sort by date (newest first)
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = a.frontmatter.date;
    const dateB = b.frontmatter.date;
    
    // Handle null/undefined - put at the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    // Handle Date objects - use timestamp for numeric comparison (newest first)
    if (dateA instanceof Date && dateB instanceof Date) {
      return dateB.getTime() - dateA.getTime();
    }
    if (dateA instanceof Date) {
      const bTime = isDateString(String(dateB)) ? new Date(String(dateB)).getTime() : 0;
      return bTime - dateA.getTime();
    }
    if (dateB instanceof Date) {
      const aTime = isDateString(String(dateA)) ? new Date(String(dateA)).getTime() : 0;
      return dateB.getTime() - aTime;
    }
    
    // Handle date strings - convert to timestamp (newest first)
    const aStr = String(dateA);
    const bStr = String(dateB);
    
    if (isDateString(aStr) && isDateString(bStr)) {
      const aTime = new Date(aStr).getTime();
      const bTime = new Date(bStr).getTime();
      return bTime - aTime; // newest first
    }
    
    // Fallback to string comparison
    return String(dateB).localeCompare(String(dateA));
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No posts found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-muted">
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-sm">Title</th>
            <th className="text-left p-3 font-medium text-sm">Author</th>
            <th className="text-left p-3 font-medium text-sm">Date</th>
            <th className="text-left p-3 font-medium text-sm">Categories</th>
            <th className="text-left p-3 font-medium text-sm">Tags</th>
            <th className="text-left p-3 font-medium text-sm">Description</th>
            <th className="text-center p-3 font-medium text-sm w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedPosts.map((post) => (
            <tr
              key={post.path}
              className="border-b hover:bg-accent/50 transition-colors"
            >
              <td className="p-3 text-sm font-medium">
                <div className="flex items-center gap-2 group">
                  <span className="flex-1">
                    {post.frontmatter.title || post.name}
                  </span>
                  {(() => {
                    const postUrl = buildPostUrl(settings.baseUrl, settings.urlFormat, post.frontmatter);
                    return postUrl ? (
                      <a
                        href={postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                        title={`Open: ${postUrl}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null;
                  })()}
                </div>
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {post.frontmatter.author || '-'}
              </td>
              <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                {post.frontmatter.date 
                  ? (post.frontmatter.date instanceof Date
                      ? formatDateValue(post.frontmatter.date.toISOString())
                      : (typeof post.frontmatter.date === 'string' && isDateString(post.frontmatter.date)
                          ? formatDateValue(post.frontmatter.date)
                          : post.frontmatter.date))
                  : '-'}
              </td>
              <td className="p-3 text-sm">
                {post.frontmatter.categories && post.frontmatter.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {post.frontmatter.categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-3 text-sm">
                {post.frontmatter.tags && post.frontmatter.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {post.frontmatter.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block rounded-full border px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                {post.frontmatter.description || '-'}
              </td>
              <td className="p-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(post)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(post)}
                    className="inline-flex items-center justify-center rounded-md p-2 text-sm text-destructive hover:bg-destructive hover:text-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

