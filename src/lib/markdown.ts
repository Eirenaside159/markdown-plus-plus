import matter from 'gray-matter';
import yaml from 'js-yaml';
import type { MarkdownFile, FrontMatter } from '@/types';
import { getSettings } from '@/lib/settings';

export function parseMarkdown(content: string, path: string, name: string): MarkdownFile {
  try {
    // Preserve content exactly as-is to avoid unintended diffs
    const cleanedContent = content;
    
    const yamlEngine = {
      parse: (src: string) => yaml.load(src, { schema: yaml.FAILSAFE_SCHEMA }) as any,
      stringify: (obj: any) => yaml.dump(obj, {
        schema: yaml.FAILSAFE_SCHEMA,
        lineWidth: -1,
        noRefs: true,
        styles: { '!!str': 'plain' },
      }),
    };
    const { data, content: markdownContent } = matter(cleanedContent, {
      // More tolerant parsing - supports UTF-8 characters (Arabic, Turkish, etc.)
      excerpt: false,
      // Preserve scalar types exactly as written (avoid auto-casting numbers/dates) and avoid reformatting
      engines: { yaml: yamlEngine as any },
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
    // Do not auto-add standard fields unless explicitly present in source
    const frontmatter: FrontMatter = {
      ...cleanedData, // Keep all existing fields first
    };
    
    // Set derived title only for in-memory use when missing
    if (!frontmatter.title) frontmatter.title = name.replace(/\.md$/, '');
    
    // Handle both 'category' (singular) and 'categories' (plural)
    if (frontmatter.categories === undefined) {
      if (cleanedData.category !== undefined) {
        // Convert single category to array
        frontmatter.categories = Array.isArray(cleanedData.category) ? cleanedData.category : [cleanedData.category];
      }
    } else if (!Array.isArray(frontmatter.categories)) {
      frontmatter.categories = frontmatter.categories ? [frontmatter.categories] : [];
    }
    
    if (frontmatter.tags !== undefined && !Array.isArray(frontmatter.tags)) {
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
      },
      rawContent: content,
    };
  }
}

export function stringifyMarkdown(file: MarkdownFile): string {
  // Preserve all fields, only skip null/undefined
  const cleanedFrontmatter: Record<string, unknown> = {};
  
  for (const key in file.frontmatter) {
    const value = file.frontmatter[key as keyof FrontMatter];
    
    // Only skip null/undefined - keep empty strings and empty arrays
    if (value === null || value === undefined) {
      continue;
    }
    
    // Do not coerce or transform user-provided types
    cleanedFrontmatter[key] = value;
  }
  
  // Use a YAML engine that preserves strings plainly and avoids wrapping lines
  const yamlEngine = {
    parse: (src: string) => yaml.load(src, { schema: yaml.FAILSAFE_SCHEMA }) as any,
    stringify: (obj: any) => yaml.dump(obj, {
      schema: yaml.FAILSAFE_SCHEMA,
      lineWidth: -1, // do not fold long lines (avoids >-)
      noRefs: true,
      styles: {
        '!!str': 'plain', // avoid quoting strings like '1' or 'Normal, Fairy'
      },
    }),
  };
  let output = matter.stringify(file.content, cleanedFrontmatter, { engines: { yaml: yamlEngine as any } });

  // Preserve original trailing newline presence/style to avoid spurious diffs
  const original = typeof file.rawContent === 'string' ? file.rawContent : '';
  const originalEndsWithCRLF = /\r\n$/.test(original);
  const originalEndsWithLF = /\n$/.test(original);
  const originalHasTrailingNewline = originalEndsWithLF; // LF covers CRLF as well

  if (originalHasTrailingNewline) {
    // Ensure output ends with the same newline style
    if (!/\n$/.test(output)) {
      output += originalEndsWithCRLF ? '\r\n' : '\n';
    } else if (originalEndsWithCRLF && !/\r\n$/.test(output)) {
      // Convert trailing single LF to CRLF
      output = output.replace(/\n$/, '\r\n');
    }
  } else {
    // Original had no trailing newline, remove one if serializer added it
    if (/\r\n$/.test(output)) {
      output = output.slice(0, -2);
    } else if (/\n$/.test(output)) {
      output = output.slice(0, -1);
    }
  }

  return output;
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

