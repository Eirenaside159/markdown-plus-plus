export interface MarkdownFile {
  name: string;
  path: string;
  content: string;
  frontmatter: FrontMatter;
  rawContent: string;
}

export interface FrontMatter {
  title?: string;
  date?: string;
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

