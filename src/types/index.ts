export interface MarkdownFile {
  name: string;
  path: string;
  content: string;
  frontmatter: FrontMatter;
  rawContent: string;
}

export interface FrontMatter {
  title?: string;
  date?: string | Date; // gray-matter can parse dates as Date objects
  categories?: string[];
  tags?: string[];
  author?: string;
  description?: string;
  [key: string]: unknown;
}

export interface FileTreeItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeItem[];
}

// Export AI types
export * from './ai-providers';

