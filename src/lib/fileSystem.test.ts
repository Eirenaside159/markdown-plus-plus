import { describe, it, expect, beforeEach } from 'vitest';
import { readFile, writeFile, deleteFile, readDirectory } from './fileSystem';
import { stringifyMarkdown, parseMarkdown, updateFrontmatter } from './markdown';

class MockFileHandle {
  name: string;
  private _content: string;
  constructor(name: string, content = '') {
    this.name = name;
    this._content = content;
  }
  async getFile() {
    const self = this;
    return {
      async text() {
        return self._content;
      },
    } as any;
  }
  async createWritable() {
    const self = this;
    return {
      async write(content: string) {
        self._content = content;
      },
      async close() {},
    } as any;
  }
}

type Entry = { kind: 'file' | 'directory'; name: string };

class MockDirectoryHandle {
  name: string;
  private directories: Map<string, MockDirectoryHandle> = new Map();
  private files: Map<string, MockFileHandle> = new Map();
  constructor(name: string) {
    this.name = name;
  }
  async getDirectoryHandle(name: string) {
    if (!this.directories.has(name)) {
      this.directories.set(name, new MockDirectoryHandle(name));
    }
    return this.directories.get(name)! as any;
  }
  async getFileHandle(name: string, opts?: { create?: boolean }) {
    if (!this.files.has(name)) {
      if (!opts || !opts.create) {
        throw new Error('File not found');
      }
      this.files.set(name, new MockFileHandle(name));
    }
    return this.files.get(name)! as any;
  }
  async removeEntry(name: string) {
    if (this.files.has(name)) this.files.delete(name);
    if (this.directories.has(name)) this.directories.delete(name);
  }
  async *values() {
    const entries: Entry[] = [
      ...Array.from(this.directories.keys()).map((n) => ({ kind: 'directory' as const, name: n })),
      ...Array.from(this.files.keys()).map((n) => ({ kind: 'file' as const, name: n })),
    ];
    for (const e of entries) {
      yield e as any;
    }
  }
}

describe('fileSystem flows', () => {
  let root: MockDirectoryHandle;

  beforeEach(() => {
    root = new MockDirectoryHandle('root');
  });

  it('creates a new post (frontmatter + body) and writes to disk', async () => {
    // ensure posts directory exists
    await root.getDirectoryHandle('posts');

    const mdFile = parseMarkdown('Body', 'posts/new-post.md', 'new-post.md');
    const content = stringifyMarkdown(mdFile);

    await writeFile(root as any, 'posts/new-post.md', content);

    const saved = await readFile(root as any, 'posts/new-post.md');
    expect(saved).toContain('---');
    expect(saved).toContain('title: new-post');
    expect(saved).toContain('Body');
  });

  it('edits an existing post content while preserving meta', async () => {
    const postsDir = await root.getDirectoryHandle('posts');
    const initial = stringifyMarkdown({
      name: 'existing.md',
      path: 'posts/existing.md',
      content: 'Old body',
      frontmatter: { title: 'Existing', tags: ['a'] },
      rawContent: 'Old body',
    } as any);
    const fileHandle = await (postsDir as any).getFileHandle('existing.md', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(initial);
    await writable.close();

    // read -> parse -> modify content -> write
    const read = await readFile(root as any, 'posts/existing.md');
    const parsed = parseMarkdown(read, 'posts/existing.md', 'existing.md');
    parsed.content = 'New body';
    const updated = stringifyMarkdown(parsed);
    await writeFile(root as any, 'posts/existing.md', updated);

    const final = await readFile(root as any, 'posts/existing.md');
    expect(final).toContain('title: Existing');
    expect(final).toContain('tags:');
    expect(final).toContain('New body');
  });

  it('updates only meta fields without altering body', async () => {
    const postsDir = await root.getDirectoryHandle('posts');
    const initial = stringifyMarkdown({
      name: 'meta.md',
      path: 'posts/meta.md',
      content: 'Keep me',
      frontmatter: { title: 'Meta', author: '' },
      rawContent: 'Keep me',
    } as any);
    const fileHandle = await (postsDir as any).getFileHandle('meta.md', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(initial);
    await writable.close();

    const read = await readFile(root as any, 'posts/meta.md');
    const parsed = parseMarkdown(read, 'posts/meta.md', 'meta.md');
    const updatedFile = updateFrontmatter(parsed, { author: 'Me', categories: ['x'] });
    const updated = stringifyMarkdown(updatedFile);
    await writeFile(root as any, 'posts/meta.md', updated);

    const final = await readFile(root as any, 'posts/meta.md');
    expect(final).toContain('author: Me');
    expect(final).toContain('categories:');
    expect(final).toContain('Keep me');
  });

  it('lists markdown files and directories in sorted order', async () => {
    const posts = await root.getDirectoryHandle('posts');
    const drafts = await posts.getDirectoryHandle('drafts');
    const fileA = await posts.getFileHandle('a.md', { create: true });
    const wA = await fileA.createWritable();
    await wA.write('A');
    await wA.close();
    const fileB = await drafts.getFileHandle('b.md', { create: true });
    const wB = await fileB.createWritable();
    await wB.write('B');
    await wB.close();

    const tree = await readDirectory(root as any);
    expect(tree[0].isDirectory).toBe(true);
    expect(tree[0].name).toBe('posts');
  });

  it('deletes a file successfully', async () => {
    const posts = await root.getDirectoryHandle('posts');
    const file = await posts.getFileHandle('todelete.md', { create: true });
    const w = await file.createWritable();
    await w.write('x');
    await w.close();

    await deleteFile(root as any, 'posts/todelete.md');
    // verify by attempting read, expecting failure
    await expect(readFile(root as any, 'posts/todelete.md')).rejects.toThrow();
  });

  it('ignores files and directories matching gitignore patterns', async () => {
    // Create some files that should be ignored
    const nodeModules = await root.getDirectoryHandle('node_modules');
    const nodeFile = await nodeModules.getFileHandle('package.md', { create: true });
    const w1 = await nodeFile.createWritable();
    await w1.write('ignored');
    await w1.close();

    // Create .log file that should be ignored
    const distDir = await root.getDirectoryHandle('dist');
    const logFile = await distDir.getFileHandle('build.log.md', { create: true });
    const w2 = await logFile.createWritable();
    await w2.write('ignored');
    await w2.close();

    // Create normal file that should NOT be ignored
    const validFile = await root.getFileHandle('valid.md', { create: true });
    const w3 = await validFile.createWritable();
    await w3.write('keep me');
    await w3.close();

    const tree = await readDirectory(root as any);
    
    // Should only have the valid.md file
    expect(tree.length).toBe(1);
    expect(tree[0].name).toBe('valid.md');
    expect(tree[0].isDirectory).toBe(false);
  });

  it('ignores directories with ignored patterns even if they have .md files', async () => {
    // Create sample-docs directory (should be ignored)
    const sampleDocs = await root.getDirectoryHandle('sample-docs');
    const sampleFile = await sampleDocs.getFileHandle('sample.md', { create: true });
    const w1 = await sampleFile.createWritable();
    await w1.write('ignored sample');
    await w1.close();

    // Create .vscode directory (should be ignored)
    const vscode = await root.getDirectoryHandle('.vscode');
    const vscodeFile = await vscode.getFileHandle('settings.md', { create: true });
    const w2 = await vscodeFile.createWritable();
    await w2.write('ignored vscode');
    await w2.close();

    // Create valid content directory
    const content = await root.getDirectoryHandle('content');
    const validFile = await content.getFileHandle('post.md', { create: true });
    const w3 = await validFile.createWritable();
    await w3.write('valid content');
    await w3.close();

    const tree = await readDirectory(root as any);
    
    // Should only have the content directory
    expect(tree.length).toBe(1);
    expect(tree[0].name).toBe('content');
    expect(tree[0].isDirectory).toBe(true);
  });
});


