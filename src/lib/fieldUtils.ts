import type { FieldType } from './metadataAnalyzer';

/**
 * Converts field key to a human-readable label
 * Examples:
 *   - "title" → "Title"
 *   - "created_at" → "Created At"
 *   - "publishDate" → "Publish Date"
 *   - "seo-title" → "SEO Title"
 */
export function formatFieldLabel(key: string): string {
  // Handle empty
  if (!key) return '';

  // Split by underscores, hyphens, or camelCase
  const words = key
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_-]/g, ' ') // snake_case, kebab-case → spaces
    .split(' ')
    .filter(Boolean);

  // Capitalize each word
  const formatted = words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return formatted;
}

/**
 * Infers the field type from a value
 */
export function inferFieldType(value: unknown): FieldType {
  // null/undefined → string
  if (value === null || value === undefined || value === '') {
    return 'string';
  }

  // Array
  if (Array.isArray(value)) {
    return 'array';
  }

  // Boolean
  if (typeof value === 'boolean') {
    return 'boolean';
  }

  // Number
  if (typeof value === 'number') {
    return 'number';
  }

  // Object
  if (typeof value === 'object') {
    return 'object';
  }

  // String - check if it's a date
  if (typeof value === 'string') {
    if (isDateString(value)) {
      return 'date';
    }
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

