import { describe, it, expect } from 'vitest';
import { formatFieldLabel, inferFieldType } from './fieldUtils';

describe('fieldUtils', () => {
  it('formatFieldLabel handles empty, snake, kebab, and camelCase', () => {
    expect(formatFieldLabel('')).toBe('');
    expect(formatFieldLabel('title')).toBe('Title');
    expect(formatFieldLabel('created_at')).toBe('Created At');
    expect(formatFieldLabel('seo-title')).toBe('Seo Title');
    expect(formatFieldLabel('publishDate')).toBe('Publish Date');
  });

  it('inferFieldType detects correct types including date strings', () => {
    expect(inferFieldType(null)).toBe('string');
    expect(inferFieldType(undefined)).toBe('string');
    expect(inferFieldType('')).toBe('string');
    expect(inferFieldType([])).toBe('array');
    expect(inferFieldType(true)).toBe('boolean');
    expect(inferFieldType(42)).toBe('number');
    expect(inferFieldType({ a: 1 })).toBe('object');
    expect(inferFieldType('2025-01-01')).toBe('date');
    expect(inferFieldType('not a date')).toBe('string');
  });

  it('inferFieldType uses Date.parse branch for non-pattern dates with year bounds', () => {
    // RFC 1123 format does not match the regex patterns but Date.parse can handle it
    expect(inferFieldType('Thu, 01 Jan 2000 00:00:00 GMT')).toBe('date');
    expect(inferFieldType('Thu, 01 Jan 1960 00:00:00 GMT')).toBe('string');
    expect(inferFieldType('Thu, 01 Jan 2200 00:00:00 GMT')).toBe('string');
  });
});


