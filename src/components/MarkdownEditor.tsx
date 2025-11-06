import { TiptapEditor } from './TiptapEditor';
import { useEffect, useState, useRef } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
}

// Configure marked for parsing markdown to HTML
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Configure turndown for converting HTML to markdown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

export function MarkdownEditor({ content, onChange, title, onTitleChange }: MarkdownEditorProps) {
  const [htmlContent, setHtmlContent] = useState('');
  const isInitialMount = useRef(true);
  const lastContent = useRef(content);

  // Convert markdown to HTML on initial load
  useEffect(() => {
    if (content) {
      const html = marked(content) as string;
      setHtmlContent(html);
    } else {
      setHtmlContent('');
    }
    lastContent.current = content;
  }, [content]);

  const handleChange = (html: string) => {
    // Skip change on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Convert HTML back to markdown
    const markdown = turndownService.turndown(html);
    
    // Only trigger onChange if content actually changed
    if (markdown !== lastContent.current) {
      lastContent.current = markdown;
      onChange(markdown);
    }
  };

  // Reset initial mount flag when content prop changes (new file selected)
  useEffect(() => {
    isInitialMount.current = true;
  }, [content]);

  return (
    <TiptapEditor 
      content={htmlContent} 
      onChange={handleChange}
      title={title}
      onTitleChange={onTitleChange}
    />
  );
}
