import { useMemo } from 'react';
import { Link2, ExternalLink } from 'lucide-react';
import type { MarkdownFile } from '@/types';

interface CanonicalRelatedProps {
  currentPost: MarkdownFile;
  allPosts: MarkdownFile[];
  onPostClick: (post: MarkdownFile) => void;
}

export function CanonicalRelated({ currentPost, allPosts, onPostClick }: CanonicalRelatedProps) {
  // Get canonical URL from current post
  const canonicalUrl = useMemo(() => {
    const canonical = currentPost.frontmatter.canonical || currentPost.frontmatter.canonical_url;
    return canonical ? String(canonical).trim() : null;
  }, [currentPost]);

  // Find related posts with the same canonical URL
  const relatedPosts = useMemo(() => {
    if (!canonicalUrl) return [];

    return allPosts.filter(post => {
      // Skip the current post
      if (post.path === currentPost.path) return false;

      // Check if post has the same canonical URL
      const postCanonical = post.frontmatter.canonical || post.frontmatter.canonical_url;
      if (!postCanonical) return false;

      return String(postCanonical).trim() === canonicalUrl;
    });
  }, [canonicalUrl, allPosts, currentPost.path]);

  // Don't render if no canonical URL or no related posts
  if (!canonicalUrl || relatedPosts.length === 0) {
    return null;
  }

  const formatDate = (dateStr: unknown) => {
    if (!dateStr) return '';
    try {
      const date = new Date(String(dateStr));
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Canonical Related</h3>
        <span className="text-sm text-muted-foreground">
          ({relatedPosts.length} {relatedPosts.length === 1 ? 'post' : 'posts'})
        </span>
      </div>

      {/* Canonical URL */}
      <div className="p-3 bg-muted/30 rounded-md border border-border">
        <div className="flex items-start gap-2">
          <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Canonical URL:</p>
            <a
              href={canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
              title={canonicalUrl}
            >
              {canonicalUrl}
            </a>
          </div>
        </div>
      </div>

      {/* Related Posts List */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Related posts with the same canonical URL:
        </p>
        
        <div className="space-y-2">
          {relatedPosts.map((post) => (
            <button
              key={post.path}
              onClick={() => onPostClick(post)}
              className="w-full p-3 rounded-md border border-border hover:bg-accent hover:border-primary transition-colors text-left group"
            >
              <div className="space-y-2">
                <h4 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2">
                  {post.frontmatter.title || post.name}
                </h4>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {post.frontmatter.date && (
                    <span>{formatDate(post.frontmatter.date)}</span>
                  )}
                  {post.frontmatter.author && (
                    <>
                      <span>•</span>
                      <span className="truncate">{post.frontmatter.author}</span>
                    </>
                  )}
                </div>

                {post.frontmatter.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.frontmatter.description}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <span className="truncate">{post.path}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-muted/20 rounded-md text-xs text-muted-foreground">
        <p>
          💡 These posts share the same canonical URL, indicating they are alternate versions, 
          translations, or republished content of the same article.
        </p>
      </div>
    </div>
  );
}

