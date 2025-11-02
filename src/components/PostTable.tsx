import type { MarkdownFile } from '@/types';
import { Edit, Trash2 } from 'lucide-react';

interface PostTableProps {
  posts: MarkdownFile[];
  onEdit: (post: MarkdownFile) => void;
  onDelete: (post: MarkdownFile) => void;
}

export function PostTable({ posts, onEdit, onDelete }: PostTableProps) {
  // Sort by date (newest first)
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = a.frontmatter.date || '';
    const dateB = b.frontmatter.date || '';
    return dateB.localeCompare(dateA);
  });

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
                {post.frontmatter.title || post.name}
              </td>
              <td className="p-3 text-sm text-muted-foreground">
                {post.frontmatter.author || '-'}
              </td>
              <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
                {post.frontmatter.date || '-'}
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
                    className="inline-flex items-center justify-center rounded-md p-2 text-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
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

