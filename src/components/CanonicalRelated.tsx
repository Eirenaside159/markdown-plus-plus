import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Canonical URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Canonical URL</label>
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-2 text-sm rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors break-all"
          title={canonicalUrl}
        >
          {canonicalUrl}
        </a>
      </div>

      {/* Related Posts */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Related Posts</label>
          <p className="text-xs text-muted-foreground mt-1">
            {relatedPosts.length} {relatedPosts.length === 1 ? 'post shares' : 'posts share'} this URL
          </p>
        </div>
        
        <div className="space-y-2">
          {relatedPosts.map((post) => (
            <button
              key={post.path}
              onClick={() => onPostClick(post)}
              className="w-full p-3 rounded-md border hover:bg-accent hover:border-primary transition-colors text-left group"
            >
              <div className="space-y-1.5">
                <h5 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {post.frontmatter.title || post.name}
                </h5>
                
                {(post.frontmatter.date || post.frontmatter.author) && (
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
                )}

                {post.frontmatter.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {post.frontmatter.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>These posts share the same canonical URL (alternate versions, translations, or republished content).</span>
        </p>
      </div>
    </div>
  );
}

