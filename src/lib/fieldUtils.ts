import type { FieldType } from './metaAnalyzer';

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
export function isDateString(str: string): boolean {
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
 * Formats a date value for display
 * Attempts to parse various date formats and returns a consistent format
 * Returns original string if it's not a valid date
 */
export function formatDateValue(value: string): string {
  if (!value || !isDateString(value)) {
    return value;
  }

  try {
    const date = new Date(value);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return value;
    }

    // Format as: Jan 15, 2024
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    return date.toLocaleDateString('en-US', options);
  } catch {
    return value;
  }
}

/**
 * Normalizes a date value to ISO format for sorting/filtering
 * Returns original string if it's not a valid date
 */
export function normalizeDateValue(value: string): string {
  if (!value || !isDateString(value)) {
    return value;
  }

  try {
    const date = new Date(value);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return value;
    }

    // Return ISO format for consistent sorting
    return date.toISOString();
  } catch {
    return value;
  }
}

/**
 * Generates a URL-friendly slug from a string (handles Turkish and other special characters)
 * Examples:
 *   - "Merhaba Dünya!" → "merhaba-dunya"
 *   - "Hello World 123" → "hello-world-123"
 *   - "Çok Güzel Şeyler" → "cok-guzel-seyler"
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  
  // Character replacements for Turkish and other special characters
  const charMap: Record<string, string> = {
    'ı': 'i', 'İ': 'i', 'ş': 's', 'Ş': 's',
    'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
    'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
    'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
    'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
    'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u',
    'ñ': 'n', 'ý': 'y', 'ÿ': 'y',
  };
  
  let slug = text.toLowerCase();
  
  // Replace special characters
  slug = slug.split('').map(char => charMap[char] || char).join('');
  
  // Remove any character that's not alphanumeric, space, or hyphen
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  
  // Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-');
  
  // Replace multiple hyphens with single hyphen
  slug = slug.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');
  
  return slug;
}

