import { describe, it, expect } from 'vitest';
import { 
  formatFieldLabel, 
  inferFieldType, 
  isDateString,
  isDateTimeString,
  formatDateValue, 
  normalizeDateValue,
  generateSlug 
} from './fieldUtils';

describe('fieldUtils', () => {
  it('formatFieldLabel handles empty, snake, kebab, and camelCase', () => {
    expect(formatFieldLabel('')).toBe('');
    expect(formatFieldLabel('title')).toBe('Title');
    expect(formatFieldLabel('created_at')).toBe('Created At');
    expect(formatFieldLabel('seo-title')).toBe('Seo Title');
    expect(formatFieldLabel('publishDate')).toBe('Publish Date');
  });

  it('inferFieldType detects correct types including date and datetime strings', () => {
    expect(inferFieldType(null)).toBe('string');
    expect(inferFieldType(undefined)).toBe('string');
    expect(inferFieldType('')).toBe('string');
    expect(inferFieldType([])).toBe('array');
    expect(inferFieldType(true)).toBe('boolean');
    expect(inferFieldType(42)).toBe('number');
    expect(inferFieldType({ a: 1 })).toBe('object');
    expect(inferFieldType('2025-01-01')).toBe('date');
    expect(inferFieldType('2025-01-01T10:30:00Z')).toBe('datetime');
    expect(inferFieldType('2025-01-01 10:30')).toBe('datetime');
    expect(inferFieldType('not a date')).toBe('string');
  });

  it('inferFieldType uses Date.parse branch for non-pattern dates with year bounds', () => {
    // RFC 1123 format does not match the regex patterns but Date.parse can handle it
    expect(inferFieldType('Thu, 01 Jan 2000 00:00:00 GMT')).toBe('date');
    expect(inferFieldType('Thu, 01 Jan 1960 00:00:00 GMT')).toBe('string');
    expect(inferFieldType('Thu, 01 Jan 2200 00:00:00 GMT')).toBe('string');
  });

  describe('isDateTimeString', () => {
    it('detects ISO 8601 datetime with time', () => {
      expect(isDateTimeString('2025-01-15T10:30:00Z')).toBe(true);
      expect(isDateTimeString('2025-01-15T10:30:00.000Z')).toBe(true);
      expect(isDateTimeString('2025-01-15T10:30')).toBe(true);
    });

    it('detects datetime with space separator', () => {
      expect(isDateTimeString('2025-01-15 10:30')).toBe(true);
      expect(isDateTimeString('2025-01-15 10:30:00')).toBe(true);
      expect(isDateTimeString('2025/01/15 10:30')).toBe(true);
    });

    it('rejects date-only strings', () => {
      expect(isDateTimeString('2025-01-15')).toBe(false);
      expect(isDateTimeString('2025/01/15')).toBe(false);
    });

    it('rejects non-date strings', () => {
      expect(isDateTimeString('not a date')).toBe(false);
      expect(isDateTimeString('hello world')).toBe(false);
      expect(isDateTimeString('')).toBe(false);
    });
  });

  describe('isDateString', () => {
    it('detects ISO 8601 date only', () => {
      expect(isDateString('2025-01-15')).toBe(true);
      expect(isDateString('2025/01/15')).toBe(true);
    });

    it('detects various date formats', () => {
      expect(isDateString('2025/01/15')).toBe(true);
      expect(isDateString('15-01-2025')).toBe(true);
      expect(isDateString('15/01/2025')).toBe(true);
      expect(isDateString('15.01.2025')).toBe(true);
      expect(isDateString('15-01-25')).toBe(true);
    });

    it('detects text date formats', () => {
      expect(isDateString('15 January 2025')).toBe(true);
      expect(isDateString('January 15, 2025')).toBe(true);
      expect(isDateString('Jan 15 2025')).toBe(true);
    });

    it('rejects non-date strings', () => {
      expect(isDateString('not a date')).toBe(false);
      expect(isDateString('hello world')).toBe(false);
      expect(isDateString('123456')).toBe(false);
    });

    it('rejects dates outside reasonable range', () => {
      expect(isDateString('Thu, 01 Jan 1960 00:00:00 GMT')).toBe(false);
      expect(isDateString('Thu, 01 Jan 2200 00:00:00 GMT')).toBe(false);
    });

    it('handles empty and invalid inputs', () => {
      expect(isDateString('')).toBe(false);
    });
  });

  describe('formatDateValue', () => {
    it('formats ISO 8601 dates', () => {
      const result = formatDateValue('2025-01-15');
      expect(result).toBe('Jan 15, 2025');
    });

    it('formats dates with time', () => {
      const result = formatDateValue('2025-01-15T10:30:00Z');
      // The exact result depends on timezone, but it should start with month
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });

    it('formats ISO 8601 dates with milliseconds', () => {
      const result = formatDateValue('2025-10-06T00:00:00.000Z');
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
      expect(result).not.toContain('T');
      expect(result).not.toContain('Z');
      console.log('Formatted result for 2025-10-06T00:00:00.000Z:', result);
    });

    it('handles various date formats', () => {
      expect(formatDateValue('2025/01/15')).toBe('Jan 15, 2025');
      expect(formatDateValue('January 15, 2025')).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    });

    it('returns original string if not a date', () => {
      expect(formatDateValue('not a date')).toBe('not a date');
      expect(formatDateValue('hello world')).toBe('hello world');
    });

    it('handles empty strings', () => {
      expect(formatDateValue('')).toBe('');
    });
  });

  describe('normalizeDateValue', () => {
    it('normalizes ISO 8601 dates to ISO string', () => {
      const result = normalizeDateValue('2025-01-15');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.startsWith('2025-01-15')).toBe(true);
    });

    it('normalizes various date formats to ISO string', () => {
      const result1 = normalizeDateValue('2025/01/15');
      expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      const result2 = normalizeDateValue('January 15, 2025');
      expect(result2).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('returns original string if not a date', () => {
      expect(normalizeDateValue('not a date')).toBe('not a date');
      expect(normalizeDateValue('hello world')).toBe('hello world');
    });

    it('handles empty strings', () => {
      expect(normalizeDateValue('')).toBe('');
    });

    it('allows proper date sorting', () => {
      const dates = [
        '2025-03-15',
        '2025-01-15',
        '2025-02-15',
      ];
      const normalized = dates.map(normalizeDateValue);
      const sorted = [...normalized].sort();
      
      // Should be sorted chronologically
      expect(sorted[0]).toContain('2025-01-15');
      expect(sorted[1]).toContain('2025-02-15');
      expect(sorted[2]).toContain('2025-03-15');
    });
  });

  describe('generateSlug', () => {
    it('converts basic strings to lowercase with hyphens', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('This is a Test')).toBe('this-is-a-test');
    });

    it('handles Turkish characters', () => {
      expect(generateSlug('Merhaba Dünya')).toBe('merhaba-dunya');
      expect(generateSlug('Çok Güzel Şeyler')).toBe('cok-guzel-seyler');
      expect(generateSlug('Işık Ağacı Öğrenci')).toBe('isik-agaci-ogrenci');
      expect(generateSlug('İstanbul Şehri')).toBe('istanbul-sehri');
    });

    it('handles other special characters', () => {
      expect(generateSlug('Café Résumé')).toBe('cafe-resume');
      expect(generateSlug('Niño España')).toBe('nino-espana');
    });

    it('removes special punctuation and symbols', () => {
      expect(generateSlug('Hello! World?')).toBe('hello-world');
      expect(generateSlug('Test @ 100% Success')).toBe('test-100-success');
      expect(generateSlug('Foo & Bar')).toBe('foo-bar');
    });

    it('handles multiple spaces and hyphens', () => {
      expect(generateSlug('Hello    World')).toBe('hello-world');
      expect(generateSlug('Hello - - World')).toBe('hello-world');
      expect(generateSlug('Test   -  Space')).toBe('test-space');
    });

    it('preserves numbers', () => {
      expect(generateSlug('2024 Year End Report')).toBe('2024-year-end-report');
      expect(generateSlug('Test 123 Demo')).toBe('test-123-demo');
    });

    it('handles leading and trailing spaces/hyphens', () => {
      expect(generateSlug('  Hello World  ')).toBe('hello-world');
      expect(generateSlug('- Leading Hyphen')).toBe('leading-hyphen');
      expect(generateSlug('Trailing Hyphen -')).toBe('trailing-hyphen');
    });

    it('handles empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('handles all uppercase', () => {
      expect(generateSlug('HELLO WORLD')).toBe('hello-world');
      expect(generateSlug('TÜRKÇE METİN')).toBe('turkce-metin');
    });

    it('handles mixed case', () => {
      expect(generateSlug('HeLLo WoRLd')).toBe('hello-world');
      expect(generateSlug('TüRkÇe MeTİN')).toBe('turkce-metin');
    });
  });
});


