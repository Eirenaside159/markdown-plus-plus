import type { MarkdownFile } from '@/types';

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export interface MetaField {
  key: string;
  type: FieldType;
  commonValues?: unknown[];
  isRequired?: boolean;
}

export interface MetaSchema {
  fields: MetaField[];
}

/**
 * Analyzes all posts and extracts unique meta fields with their types
 */
export function analyzeMeta(posts: MarkdownFile[]): MetaSchema {
  const fieldMap = new Map<string, Set<unknown>>();

  // Collect all unique fields and their values
  posts.forEach(post => {
    Object.entries(post.frontmatter).forEach(([key, value]) => {
      if (!fieldMap.has(key)) {
        fieldMap.set(key, new Set());
      }
      if (value !== null && value !== undefined && value !== '') {
        fieldMap.get(key)!.add(JSON.stringify(value));
      }
    });
  });

  // Convert to MetaField array
  const fields: MetaField[] = [];

  fieldMap.forEach((valuesSet, key) => {
    const values = Array.from(valuesSet).map(v => {
      try {
        return JSON.parse(v as string);
      } catch {
        return v;
      }
    });

    const type = inferFieldType(values);
    
    fields.push({
      key,
      type,
      commonValues: values.slice(0, 10), // Keep first 10 unique values for reference
    });
  });

  // Sort: common fields first, then alphabetically
  const commonFields = ['title', 'date', 'author', 'description', 'categories', 'tags'];
  fields.sort((a, b) => {
    const aIndex = commonFields.indexOf(a.key);
    const bIndex = commonFields.indexOf(b.key);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return a.key.localeCompare(b.key);
  });

  return { fields };
}

/**
 * Infers the field type based on sample values
 */
function inferFieldType(values: unknown[]): FieldType {
  if (values.length === 0) return 'string';

  const firstValue = values[0];

  // Check if all values are arrays
  if (Array.isArray(firstValue)) {
    return 'array';
  }

  // Check if all values are booleans
  if (typeof firstValue === 'boolean') {
    return 'boolean';
  }

  // Check if all values are numbers
  if (typeof firstValue === 'number') {
    return 'number';
  }

  // Check if all values are date strings
  if (typeof firstValue === 'string') {
    if (isDateString(firstValue)) {
      return 'date';
    }
  }

  // Check if all values are objects
  if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue)) {
    return 'object';
  }

  // Default to string
  return 'string';
}

/**
 * Checks if a string represents a date
 */
function isDateString(str: string): boolean {
  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    /^\d{4}\/\d{2}\/\d{2}/, // YYYY/MM/DD
    /^\d{2}[-/.]\d{2}[-/.]\d{4}/, // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
    /^\d{2}[-/.]\d{2}[-/.]\d{2}/, // DD-MM-YY, DD/MM/YY, DD.MM.YY
    /^\d{1,2}\s+\w+\s+\d{4}/, // 1 January 2025, 01 Jan 2025
    /^\w+\s+\d{1,2},?\s+\d{4}/, // January 1, 2025 or Jan 1 2025
  ];

  // Check if matches any pattern
  if (datePatterns.some(pattern => pattern.test(str))) {
    return true;
  }

  // Try parsing as Date
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    // Additional check: make sure it's a reasonable date (between 1970 and 2100)
    const year = new Date(timestamp).getFullYear();
    return year >= 1970 && year <= 2100;
  }

  return false;
}

/**
 * Gets all unique values for a specific field across all posts
 */
export function getFieldValues(posts: MarkdownFile[], fieldKey: string): unknown[] {
  const valuesSet = new Set<string>();
  
  posts.forEach(post => {
    const value = post.frontmatter[fieldKey];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => valuesSet.add(String(v)));
      } else {
        valuesSet.add(JSON.stringify(value));
      }
    }
  });

  return Array.from(valuesSet).map(v => {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }).sort();
}

