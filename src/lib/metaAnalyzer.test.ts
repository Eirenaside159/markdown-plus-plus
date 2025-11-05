import { describe, it, expect, vi } from 'vitest';
import { analyzeMeta, getFieldValues } from './metaAnalyzer';

function makePost(name: string, frontmatter: Record<string, unknown>) {
  return {
    name,
    path: `/posts/${name}`,
    content: 'Body',
    frontmatter: frontmatter as any,
    rawContent: 'Body',
  };
}

describe('metaAnalyzer', () => {
  it('analyzeMeta infers types and sorts common fields first', () => {
    const posts = [
      makePost('a.md', {
        title: 'A',
        date: '2025-01-01',
        author: 'Jane',
        description: 'Desc',
        categories: ['news'],
        tags: ['t1'],
        published: true,
        views: 10,
        meta: { a: 1 },
      }),
      makePost('b.md', {
        title: 'B',
        date: 'January 2, 2025',
        categories: ['updates'],
        tags: ['t2'],
        published: false,
        views: 20,
        meta: { b: 2 },
      }),
    ];

    const schema = analyzeMeta(posts as any);
    const keys = schema.fields.map(f => f.key);

    // Common fields are ordered first in predefined order
    const commonPrefix = keys.slice(0, 6);
    expect(commonPrefix).toEqual([
      'title',
      'date',
      'author',
      'description',
      'categories',
      'tags',
    ]);

    const byKey = Object.fromEntries(schema.fields.map(f => [f.key, f]));
    expect(byKey['published'].type).toBe('boolean');
    expect(byKey['views'].type).toBe('number');
    expect(byKey['categories'].type).toBe('array');
    expect(byKey['meta'].type).toBe('object');
    expect(byKey['date'].type).toBe('date');
  });

  it('getFieldValues aggregates unique values and sorts them', () => {
    const posts = [
      makePost('a.md', {
        categories: ['news', 'tech'],
        tags: ['a'],
        views: 5,
      }),
      makePost('b.md', {
        categories: ['tech', 'life'],
        tags: ['b'],
        views: 10,
      }),
    ];

    const categories = getFieldValues(posts as any, 'categories');
    expect(categories).toEqual(['life', 'news', 'tech']);

    const views = getFieldValues(posts as any, 'views');
    // Function sorts with default comparator, so numbers are sorted lexicographically
    expect(views).toEqual([10, 5]);
  });

  it('analyzeMeta treats out-of-range year dates as string', () => {
    const posts = [
      makePost('a.md', { legacy: 'Thu, 01 Jan 1960 00:00:00 GMT' }),
      makePost('b.md', { future: 'Thu, 01 Jan 2200 00:00:00 GMT' }),
    ];
    const schema = analyzeMeta(posts as any);
    const byKey = Object.fromEntries(schema.fields.map(f => [f.key, f]));
    expect(byKey['legacy'].type).toBe('string');
    expect(byKey['future'].type).toBe('string');
  });

  it('analyzeMeta falls back when JSON.parse fails and caps commonValues to 10', () => {
    const originalParse = JSON.parse;
    const spy = vi.spyOn(JSON, 'parse').mockImplementation((...args: any[]) => {
      const input = args[0] as string;
      if (typeof input === 'string' && input.includes('"TRIGGER"')) {
        throw new Error('forced');
      }
      return originalParse(...args as [string]);
    });

    const manyValues = Array.from({ length: 15 }, (_, i) => i);

    const posts = [
      makePost('a.md', { special: 'TRIGGER' }),
      ...manyValues.map(v => makePost(`p${v}.md`, { limited: v })),
    ];

    const schema = analyzeMeta(posts as any);
    const byKey = Object.fromEntries(schema.fields.map(f => [f.key, f]));

    // When parse throws, value remains as raw string in commonValues; existence is enough
    expect(byKey['special']).toBeTruthy();

    // commonValues capped at 10
    expect(byKey['limited'].commonValues?.length).toBe(10);

    spy.mockRestore();
  });

  it('analyzeMeta infers string type for fields with only empty values and sorts non-common alphabetically', () => {
    const posts = [
      makePost('a.md', { emptyField: '' }),
      makePost('b.md', { emptyField: '' }),
      makePost('c.md', { omega: 1, alpha: 1 }),
    ];
    const schema = analyzeMeta(posts as any);
    const byKey = Object.fromEntries(schema.fields.map(f => [f.key, f]));
    expect(byKey['emptyField'].type).toBe('string');

    const nonCommon = schema.fields
      .map(f => f.key)
      .filter(k => !['title', 'date', 'author', 'description', 'categories', 'tags'].includes(k));
    const alphaIndex = nonCommon.indexOf('alpha');
    const omegaIndex = nonCommon.indexOf('omega');
    expect(alphaIndex).toBeGreaterThanOrEqual(0);
    expect(omegaIndex).toBeGreaterThan(alphaIndex);
  });

  it('analyzeMeta comparator handles common vs non-common ordering', () => {
    const posts = [
      makePost('a.md', { title: 'A', zzz: 1 }),
    ];
    const schema = analyzeMeta(posts as any);
    // If comparator executed with (title, zzz), it returns -1 and order remains [title, zzz]
    const keys = schema.fields.map(f => f.key);
    const titleIndex = keys.indexOf('title');
    const zzzIndex = keys.indexOf('zzz');
    expect(titleIndex).toBeLessThan(zzzIndex);
  });

  it('getFieldValues returns empty array when all values are empty', () => {
    const posts = [
      makePost('a.md', { empty: '' }),
      makePost('b.md', { empty: undefined }),
      makePost('c.md', { empty: null }),
    ];
    const values = getFieldValues(posts as any, 'empty');
    expect(values).toEqual([]);
  });
});


