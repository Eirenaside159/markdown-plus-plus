import matter from 'gray-matter';
import type { MarkdownFile, FrontMatter } from '@/types';

export function parseMarkdown(content: string, path: string, name: string): MarkdownFile {
  try {
    const { data, content: markdownContent } = matter(content, {
      // More tolerant parsing
      excerpt: false,
    });
    
    // Ensure frontmatter has expected structure
    const frontmatter: FrontMatter = {
      title: data.title || name.replace(/\.md$/, ''),
      author: data.author || '',
      date: data.date || '',
      description: data.description || '',
      categories: Array.isArray(data.categories) ? data.categories : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
    
    return {
      name,
      path,
      content: markdownContent,
      frontmatter,
      rawContent: content,
    };
  } catch (error) {
    console.error('Error parsing markdown:', error);
    console.warn('File will be loaded without frontmatter parsing');
    
    // If frontmatter parsing fails, try to extract content without it
    let cleanContent = content;
    
    // Check if file starts with frontmatter delimiter
    if (content.trim().startsWith('---')) {
      const parts = content.split('---');
      if (parts.length >= 3) {
        // Remove the frontmatter section and use content after second ---
        cleanContent = parts.slice(2).join('---').trim();
      }
    }
    
    return {
      name,
      path,
      content: cleanContent,
      frontmatter: {
        title: name.replace(/\.md$/, ''),
        author: '',
        date: '',
        description: '',
        categories: [],
        tags: [],
      },
      rawContent: content,
    };
  }
}

export function stringifyMarkdown(file: MarkdownFile): string {
  return matter.stringify(file.content, file.frontmatter);
}

export function updateFrontmatter(file: MarkdownFile, updates: Partial<FrontMatter>): MarkdownFile {
  return {
    ...file,
    frontmatter: {
      ...file.frontmatter,
      ...updates,
    },
  };
}

