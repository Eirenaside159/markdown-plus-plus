import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Builds a URL from base URL, format pattern, and meta fields
 * @param baseUrl - Base URL (e.g., "https://example.com")
 * @param urlFormat - URL format with placeholders (e.g., "blog/{CATEGORY}/{SLUG}")
 * @param meta - Meta fields object
 * @returns Complete URL or null if required fields are missing
 */
export function buildPostUrl(
  baseUrl: string | undefined,
  urlFormat: string | undefined,
  meta: Record<string, any>
): string | null {
  // Return null if base URL or format is missing
  if (!baseUrl || !urlFormat) {
    return null;
  }

  // Trim base URL trailing slashes
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  
  // Replace all {FIELD_NAME} placeholders with meta values
  let url = urlFormat;
  
  // Find all placeholders like {SLUG}, {CATEGORY}, etc.
  const placeholderRegex = /\{([A-Z_]+)\}/g;
  const matches = Array.from(urlFormat.matchAll(placeholderRegex));
  
  // Check if all required fields exist in meta
  for (const match of matches) {
    const fieldName = match[1].toLowerCase(); // Convert to lowercase for meta field lookup
    const metaValue = meta[fieldName];
    
    // If any required field is missing or empty, return null
    if (!metaValue || metaValue === '') {
      return null;
    }
    
    // Replace placeholder with actual value
    // Handle arrays by joining with commas
    const value = Array.isArray(metaValue) ? metaValue.join(',') : String(metaValue);
    url = url.replace(match[0], value);
  }
  
  // Combine base URL with formatted path
  return `${cleanBaseUrl}/${url}`;
}

