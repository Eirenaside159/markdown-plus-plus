import { describe, it, expect } from 'vitest';
import { parseMarkdown, stringifyMarkdown, updateFrontmatter } from './markdown';

describe('markdown lib', () => {
  it('parseMarkdown preserves custom fields, normalizes nulls and singular categories', () => {
    const md = `---\n` +
      `title: My Post\n` +
      `author: null\n` +
      `categories: tech\n` +
      `tags:\n` +
      `  - a\n` +
      `  - b\n` +
      `seo-title: SEO Title\n` +
      `---\n` +
      `Hello world`;

    const file = parseMarkdown(md, '/posts/my-post.md', 'my-post.md');

    expect(file.name).toBe('my-post.md');
    expect(file.path).toBe('/posts/my-post.md');
    expect(file.content).toBe('Hello world');
    expect(file.frontmatter.title).toBe('My Post');
    expect(file.frontmatter.author).toBe('');
    expect(file.frontmatter.categories).toEqual(['tech']);
    expect(file.frontmatter.tags).toEqual(['a', 'b']);
    expect(file.frontmatter['seo-title']).toBe('SEO Title');
  });

  it('parseMarkdown falls back to raw content on invalid frontmatter without auto-adding metas', () => {
    const invalid = `---\n: :\n---\nBody`;
    const file = parseMarkdown(invalid, '/p/invalid.md', 'invalid.md');

    // On error path, content is kept after best-effort cleanup
    expect(file.name).toBe('invalid.md');
    expect(file.path).toBe('/p/invalid.md');
    expect(typeof file.content).toBe('string');
    expect(file.frontmatter.title).toBe('invalid.md'.replace(/\.md$/, ''));
    expect(file.frontmatter.author).toBeUndefined();
    expect(file.frontmatter.categories).toBeUndefined();
    expect(file.frontmatter.tags).toBeUndefined();
  });

  it('parseMarkdown handles singular category field and converts to array', () => {
    const md = `---\n` +
      `title: My Post\n` +
      `category: news\n` +
      `---\n` +
      `Body`;

    const file = parseMarkdown(md, '/p/cat.md', 'cat.md');
    expect(file.frontmatter.categories).toEqual(['news']);
  });

  it('parseMarkdown converts scalar tags to array', () => {
    const md = `---\n` +
      `title: T\n` +
      `tags: tag1\n` +
      `---\n` +
      `Body`;

    const file = parseMarkdown(md, '/p/t.md', 't.md');
    expect(file.frontmatter.tags).toEqual(['tag1']);
  });

  it('parseMarkdown does not auto-add meta when frontmatter is missing', () => {
    const bodyOnly = `Hello content`;
    const file = parseMarkdown(bodyOnly, '/p/no-front.md', 'no-front.md');
    expect(file.frontmatter.title).toBe('no-front');
    expect(file.frontmatter.author).toBeUndefined();
    expect(file.frontmatter.date).toBeUndefined();
    expect(file.frontmatter.description).toBeUndefined();
    expect(file.frontmatter.categories).toBeUndefined();
    expect(file.frontmatter.tags).toBeUndefined();
  });

  it('stringifyMarkdown omits null/undefined but keeps empty strings/arrays', () => {
    const mdFile = {
      name: 'x.md',
      path: '/x.md',
      content: 'Body',
      frontmatter: {
        title: 'X',
        description: '', // keep
        tags: [], // keep
        author: null as unknown as string, // omit
        extra: undefined as unknown as string, // omit
      },
      rawContent: 'Body',
    };

    const output = stringifyMarkdown(mdFile as any);
    expect(output).toContain('title: X');
    // gray-matter stringifies empty strings with single quotes
    expect(output).toContain("description: ''");
    expect(output).toContain('tags:');
    expect(output).not.toContain('author:');
    expect(output).not.toContain('extra:');
  });

  it('updateFrontmatter merges fields without dropping unspecified keys', () => {
    const original = parseMarkdown('---\ntitle: A\nseo: X\n---\nHi', '/p/a.md', 'a.md');
    const updated = updateFrontmatter(original, { title: 'B', author: 'Me' });

    expect(updated.frontmatter.title).toBe('B');
    expect(updated.frontmatter.author).toBe('Me');
    expect(updated.frontmatter['seo']).toBe('X');
  });
});


