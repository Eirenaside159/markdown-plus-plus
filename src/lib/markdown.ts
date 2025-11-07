import matter from 'gray-matter';
import type { MarkdownFile, FrontMatter } from '@/types';
import { getSettings } from '@/lib/settings';

export function parseMarkdown(content: string, path: string, name: string): MarkdownFile {
  try {
    // Clean up content - remove extra blank lines at the start
    const cleanedContent = content.trim();
    
    const { data, content: markdownContent } = matter(cleanedContent, {
      // More tolerant parsing - supports UTF-8 characters (Arabic, Turkish, etc.)
      excerpt: false,
    });
    
    // Convert null values to empty strings
    const cleanedData: Record<string, any> = {};
    for (const key in data) {
      if (data[key] === null) {
        cleanedData[key] = '';
      } else {
        cleanedData[key] = data[key];
      }
    }
    
    // Preserve ALL existing frontmatter fields
    // Only set defaults for missing standard fields
    const frontmatter: FrontMatter = {
      ...cleanedData, // Keep all existing fields first
    };
    
    // Set standard fields only if they don't exist
    if (!frontmatter.title) frontmatter.title = name.replace(/\.md$/, '');
    if (frontmatter.author === undefined) frontmatter.author = '';
    if (frontmatter.date === undefined) frontmatter.date = '';
    if (frontmatter.description === undefined) frontmatter.description = '';
    
    // Handle both 'category' (singular) and 'categories' (plural)
    if (frontmatter.categories === undefined) {
      if (cleanedData.category !== undefined) {
        // Convert single category to array
        frontmatter.categories = Array.isArray(cleanedData.category) ? cleanedData.category : [cleanedData.category];
      } else {
        frontmatter.categories = [];
      }
    } else if (!Array.isArray(frontmatter.categories)) {
      frontmatter.categories = frontmatter.categories ? [frontmatter.categories] : [];
    }
    
    if (frontmatter.tags === undefined) {
      frontmatter.tags = [];
    } else if (!Array.isArray(frontmatter.tags)) {
      frontmatter.tags = frontmatter.tags ? [frontmatter.tags] : [];
    }
    
    return {
      name,
      path,
      content: markdownContent,
      frontmatter,
      rawContent: content,
    };
  } catch (error) {
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
  // Preserve all fields, only skip null/undefined
  const cleanedFrontmatter: Record<string, unknown> = {};
  const settings = getSettings();
  
  for (const key in file.frontmatter) {
    const value = file.frontmatter[key as keyof FrontMatter];
    
    // Only skip null/undefined - keep empty strings and empty arrays
    if (value === null || value === undefined) {
      continue;
    }
    
    const multiplicity = settings.metaFieldMultiplicity?.[key];
    if (multiplicity === 'single' && Array.isArray(value)) {
      // Convert array to single value (keep first if exists, else empty string)
      cleanedFrontmatter[key] = (value as unknown[]).length > 0 ? (value as unknown[])[0] : '';
    } else if (multiplicity === 'multi' && typeof value === 'string') {
      // Convert single string to array
      const trimmed = (value as string).trim();
      cleanedFrontmatter[key] = trimmed ? [trimmed] : [];
    } else {
      cleanedFrontmatter[key] = value;
    }
  }
  
  return matter.stringify(file.content, cleanedFrontmatter);
}

export function updateFrontmatter(file: MarkdownFile, updates: Partial<FrontMatter>): MarkdownFile {
  return {
    ...file,
    frontmatter: {
      ...file.frontmatter, // Preserve all existing fields including custom ones
      ...updates, // Only update the specified fields
    },
  };
}

